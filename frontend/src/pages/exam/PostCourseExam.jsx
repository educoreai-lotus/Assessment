import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import QuestionCard from '../../components/QuestionCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import CameraPreview from '../../components/CameraPreview';

import { examApi } from '../../services/examApi';
import { http } from '../../services/http';
import { normalizeExamPackage } from '../../utils/examPackage';

// Mount guard + instrumentation
// Ensures createExam is called only once per mount
// and helps detect unexpected remounts


async function waitForPackage(examId, maxWaitMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await http.get(`/api/exams/${examId}`);
      // eslint-disable-next-line no-console
      console.log('[POSTCOURSE][EXAM][STATUS][POLL]', {
        code: res?.status,
        package_ready: !!res?.data?.package_ready,
      });
      if (res?.data?.package_ready) {
        try { console.log('[POSTCOURSE][EXAM][READY]', { exam_id: examId }); } catch {}
        return res.data;
      }
    } catch (err) {
      // Ignore until ready
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error("Exam package still not ready after waiting");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForPackageWithGrace(examId, maxWaitMs = 60000, graceMs = 1000) {
  const data = await waitForPackage(examId, maxWaitMs);
  // Small grace window to allow SQL exam.status to flip to READY
  await sleep(graceMs);
  return data;
}

export default function PostCourseExam() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Gate: redirect to Intro unless accepted for this attempt
  useEffect(() => {
    const acceptedParam = searchParams.get('introAccepted') === 'true';
    const attemptParam = searchParams.get('attemptId');
    const acceptedLocal = attemptParam ? localStorage.getItem(`introAccepted:${attemptParam}`) === 'true' : false;
    if (!acceptedParam && !acceptedLocal) {
      const qp = new URLSearchParams();
      qp.set('examType', 'postcourse');
      const examIdQ = searchParams.get('examId');
      const attemptIdQ = searchParams.get('attemptId');
      const courseIdQ = searchParams.get('courseId') || searchParams.get('course_id');
      const courseNameQ = searchParams.get('courseName') || searchParams.get('course_name');
      if (examIdQ) qp.set('examId', examIdQ);
      if (attemptIdQ) qp.set('attemptId', attemptIdQ);
      if (courseIdQ) qp.set('courseId', courseIdQ);
      if (courseNameQ) qp.set('courseName', courseNameQ);
      navigate(`/exam-intro?${qp.toString()}`, { replace: true });
    }
  }, [navigate, searchParams]);

  const creationStarted = useRef(false);
  const mountCountRef = useRef(0);
  const clearedOnceRef = useRef(false);
  const mountedRef = useRef(false);

  // Clear stale attempt id on every fresh visit
  useEffect(() => {
    try {
      localStorage.removeItem("postcourse_attempt_id");
      localStorage.removeItem("postcourse_exam_id");
      localStorage.removeItem("postcourse_answers");
    } catch {}
  }, []);

  const initialExamId = useMemo(() => {
    const qp = searchParams.get('examId');
    if (qp) return qp;
    const stored = localStorage.getItem('exam_postcourse_id');
    if (stored) return stored;
    return null;
  }, [searchParams]);

  // No course context for postcourse; strictly use IDs from URL

  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [examId, setExamId] = useState(initialExamId);
  const [attemptId, setAttemptId] = useState(searchParams.get('attemptId') || null);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [examReady, setExamReady] = useState(false);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraOk, setCameraOk] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const hasStreamRef = useRef(false);

  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [strikes, setStrikes] = useState(0);
  const [examCanceled, setExamCanceled] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');
  const proctoringStartedRef = useRef(false);
  const [expiresAtIso, setExpiresAtIso] = useState(null);
  const [remainingSec, setRemainingSec] = useState(null);
  const recreateOnceRef = useRef(false);
  // DevLab iframe runs self-contained via srcDoc; no JS bridge
  const [stage, setStage] = useState('theory'); // 'theory' | 'coding' | 'submit'
  const [devlabHtml, setDevlabHtml] = useState(null);
  const devlabHtmlRef = useRef(null);
  const devlabCompletedRef = useRef(false);
  const [devlabCompleted, setDevlabCompleted] = useState(false);
  const [hasCoding, setHasCoding] = useState(false);
  const isSubmittingRef = useRef(false);
  const hasStartedRef = useRef(false);
  const proctoringListenersEnabledRef = useRef(true);
  const removeProctorListenersRef = useRef(() => {});
  const devlabCodingPostedRef = useRef(false);
  const answeredCount = useMemo(() =>
    Object.values(answers).filter(v => v !== '' && v != null).length,
  [answers]);
  const totalCount = questions.length;

  function disableProctoringListeners() {
    try {
      proctoringListenersEnabledRef.current = false;
      if (typeof removeProctorListenersRef.current === 'function') {
        removeProctorListenersRef.current();
      }
      // eslint-disable-next-line no-console
      console.log('[POSTCOURSE][PROCTOR][LISTENERS_DISABLED]');
    } catch {}
  }

  // DevLab grading ingestion (iframe-safe postMessage)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event?.data?.type !== 'assessmentSolutionsSubmitted') return;
      const { evaluation, questions, solutions } = event.data || {};
      const score = (evaluation && typeof evaluation.score === 'number') ? evaluation.score : 0;
      const skillsFeedback = (evaluation && typeof evaluation.skills === 'object' && evaluation.skills) ? evaluation.skills : {};
      try {
        // eslint-disable-next-line no-console
        console.log('[DEVLAB][GRADE][RECEIVED]', { score, skillsFeedback });
      } catch {}
      // Mark DevLab completion; do NOT submit here (Baseline parity)
      try { console.log('[POSTCOURSE][DEVLAB][COMPLETED]'); } catch {}
      devlabCompletedRef.current = true;
      setDevlabCompleted(true);
      // Forward coding completion to Assessment backend exactly once
      if (!devlabCodingPostedRef.current) {
        devlabCodingPostedRef.current = true;
        (async () => {
          try {
            if (!examId || !attemptId) {
              // eslint-disable-next-line no-console
              console.warn('[POSTCOURSE][DEVLAB][CODING_COMPLETE][SKIP]', { examId, attemptId });
              return;
            }
            // eslint-disable-next-line no-console
            console.log('[POSTCOURSE][DEVLAB][CODING_COMPLETE][CALLING]', { examId, attemptId });
            await http.post(`/api/exams/${encodeURIComponent(examId)}/coding/complete`, {
              attempt_id: attemptId,
              coding_results: evaluation || {},
              solutions: solutions || [],
            });
            // eslint-disable-next-line no-console
            console.log('[POSTCOURSE][DEVLAB][CODING_COMPLETE][OK]', { examId, attemptId });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[POSTCOURSE][DEVLAB][CODING_COMPLETE][ERROR]', err?.response?.data || err?.message || err);
            // allow retry on a subsequent message if it ever comes
            devlabCodingPostedRef.current = false;
          }
        })();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [examId, attemptId]);

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      mountCountRef.current += 1;
      try {
        setLoading(true);
        setError('');
        const eid = searchParams.get('examId') || null;
        const aid = searchParams.get('attemptId') || null;
        if (!eid || !aid) {
          navigate('/exam-intro?examType=postcourse', { replace: true });
          return;
        }
        setExamId(String(eid));
        setAttemptId(String(aid));
        // Poll until package is ready to avoid racing preparation
        try {
          const pkg = await waitForPackage(String(eid));
          if (pkg?.package_ready) setExamReady(true);
        } catch {}
        if (!mounted) return;
        // Reset any local UI artifacts
        proctoringStartedRef.current = false;
        setCameraReady(false);
        setCameraOk(false);
        setCameraError('');
        setQuestions([]);
        setAnswers({});
        setCurrentIdx(0);
        setExpiresAtIso(null);
        setRemainingSec(null);
        setStrikes(0);
        setBootstrapReady(true);
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to initialize post-course exam');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    bootstrap();
    return () => { mounted = false; };
  }, [navigate, searchParams]);

  // Persist acceptance token tied to attempt once known
  useEffect(() => {
    const acceptedParam = searchParams.get('introAccepted') === 'true';
    if (acceptedParam && attemptId) {
      try { localStorage.setItem(`introAccepted:${attemptId}`, 'true'); } catch {}
    }
  }, [attemptId, searchParams]);

  // Debug: log camera readiness changes
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[POSTCOURSE][CAMERA][READY_STATE]', { cameraReady });
  }, [cameraReady]);

  // Debug: log exam readiness changes
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[POSTCOURSE][EXAM][READY_STATE]', { examReady });
  }, [examReady]);

  useEffect(() => {
    let cancelled = false;
    async function startIfReady() {
      if (!examId || !attemptId) return;
      // Start exam based ONLY on exam readiness; camera/proctoring run in parallel.
      if (!examReady) return;
      if (hasStartedRef.current) return;
      try {
        setQuestionsLoading(true);
        // eslint-disable-next-line no-console
        console.log('[POSTCOURSE][EXAM][START][ALLOWED]', { examId, attemptId });
        // Grace delay to avoid race between package_ready and SQL exam.status flip
        await sleep(1000);
        const data = await examApi.start(examId, { attempt_id: attemptId });
        if (cancelled) return;
        hasStartedRef.current = true;
        const pkg = normalizeExamPackage(data || {});
        // TEMP: debug parity logs (baseline-style)
        try {
          console.log('[POSTCOURSE][PKG][NORMALIZED]', {
            questions: Array.isArray(pkg.questions) ? pkg.questions.length : 0,
            coding_questions: Array.isArray(pkg.coding_questions) ? pkg.coding_questions.length : 0,
            has_html: !!pkg.devlab_ui?.componentHtml,
          });
        } catch {}
        setQuestions(Array.isArray(pkg.questions) ? pkg.questions : []);
        // Inject DevLab HTML ONCE, independent of later camera/proctoring/phone state changes
        try {
          const html =
            pkg?.devlab_ui?.componentHtml ||
            pkg?.devlabUi?.componentHtml ||
            pkg?.devlab_ui_html ||
            null;
          if (typeof html === 'string' && html.trim() !== '' && !devlabHtmlRef.current) {
            devlabHtmlRef.current = html;
            setDevlabHtml(html);
            // eslint-disable-next-line no-console
            console.log('[POSTCOURSE][DEVLAB][HTML_SET_ONCE]', { len: html.length });
          }
        } catch {}
        // Track whether coding exists to gate submit availability after DevLab completes
        try {
          const codingExists =
            (Array.isArray(pkg?.coding_questions) && pkg.coding_questions.length > 0) ||
            !!(pkg?.devlab_ui?.componentHtml);
          setHasCoding(!!codingExists);
        } catch {}
        setCurrentIdx(0);
        setAnswers({});
        // Entry decision based on questions, not devlab_ui:
        try {
          const hasTheory = Array.isArray(pkg.questions) && pkg.questions.length > 0;
          const hasCoding = Array.isArray(pkg.coding_questions) && pkg.coding_questions.length > 0;
          if (hasTheory) {
            setStage('theory');
            console.log('[POSTCOURSE][STAGE][SET]', 'theory');
          } else if (hasCoding) {
            setStage('coding');
            console.log('[POSTCOURSE][STAGE][SET]', 'coding');
          } else {
            setStage('theory'); // safe fallback
            console.log('[POSTCOURSE][STAGE][SET]', 'theory');
          }
        } catch {}
        try { localStorage.setItem("postcourse_answers", JSON.stringify({})); } catch {}
        // Timer fields
        if (data?.expires_at) {
          setExpiresAtIso(String(data.expires_at));
          const now = Date.now();
          const exp = new Date(String(data.expires_at)).getTime();
          const diff = Math.max(0, Math.floor((exp - now) / 1000));
          setRemainingSec(Number.isFinite(diff) ? diff : null);
        } else if (Number.isFinite(Number(data?.duration_seconds))) {
          setRemainingSec(Number(data.duration_seconds));
        }
      } catch (e) {
        const statusCode = e?.response?.status;
        const apiErr = e?.response?.data?.message || e?.response?.data?.error || e?.message || '';
        if (statusCode === 409 || apiErr === 'exam_not_ready') {
          // Not fatal: allow polling to continue and retry automatically when READY
          // eslint-disable-next-line no-console
          console.log('[POSTCOURSE][EXAM][START][NOT_READY]', { statusCode, apiErr });
          // Resume polling for readiness, then attempt starting again immediately
          try {
            // Backoff loop: poll readiness, then attempt /start again until success or timeout
            const maxAttempts = 10;
            for (let i = 0; i < maxAttempts && !cancelled && !hasStartedRef.current; i += 1) {
              const pkg = await waitForPackageWithGrace(String(examId), 60000, 1000);
              if (!pkg?.package_ready) continue;
              // eslint-disable-next-line no-console
              console.log('[POSTCOURSE][EXAM][READY]', { exam_id: String(examId), retry_index: i });
              await sleep(500);
              try {
                // eslint-disable-next-line no-console
                console.log('[POSTCOURSE][EXAM][START][ALLOWED]', { examId, attemptId, retry_index: i });
                const retryData = await examApi.start(examId, { attempt_id: attemptId });
                if (cancelled) return;
                hasStartedRef.current = true;
                const pkg2 = normalizeExamPackage(retryData || {});
                setQuestions(Array.isArray(pkg2.questions) ? pkg2.questions : []);
                try {
                  const html2 =
                    pkg2?.devlab_ui?.componentHtml ||
                    pkg2?.devlabUi?.componentHtml ||
                    pkg2?.devlab_ui_html ||
                    null;
                  if (typeof html2 === 'string' && html2.trim() !== '' && !devlabHtmlRef.current) {
                    devlabHtmlRef.current = html2;
                    setDevlabHtml(html2);
                    console.log('[POSTCOURSE][DEVLAB][HTML_SET_ONCE]', { len: html2.length });
                  }
                } catch {}
                try {
                  const codingExists2 =
                    (Array.isArray(pkg2?.coding_questions) && pkg2.coding_questions.length > 0) ||
                    !!(pkg2?.devlab_ui?.componentHtml);
                  setHasCoding(!!codingExists2);
                } catch {}
                setCurrentIdx(0);
                setAnswers({});
                try {
                  const hasTheory2 = Array.isArray(pkg2.questions) && pkg2.questions.length > 0;
                  const hasCoding2 = Array.isArray(pkg2.coding_questions) && pkg2.coding_questions.length > 0;
                  if (hasTheory2) {
                    setStage('theory');
                    console.log('[POSTCOURSE][STAGE][SET]', 'theory');
                  } else if (hasCoding2) {
                    setStage('coding');
                    console.log('[POSTCOURSE][STAGE][SET]', 'coding');
                  } else {
                    setStage('theory');
                    console.log('[POSTCOURSE][STAGE][SET]', 'theory');
                  }
                } catch {}
                try { localStorage.setItem("postcourse_answers", JSON.stringify({})); } catch {}
                if (retryData?.expires_at) {
                  setExpiresAtIso(String(retryData.expires_at));
                  const now = Date.now();
                  const exp = new Date(String(retryData.expires_at)).getTime();
                  const diff = Math.max(0, Math.floor((exp - now) / 1000));
                  setRemainingSec(Number.isFinite(diff) ? diff : null);
                } else if (Number.isFinite(Number(retryData?.duration_seconds))) {
                  setRemainingSec(Number(retryData.duration_seconds));
                }
                return;
              } catch (err2) {
                const code2 = err2?.response?.status;
                const err2Str = err2?.response?.data?.error || err2?.message || '';
                // eslint-disable-next-line no-console
                console.log('[POSTCOURSE][EXAM][START][RETRY_FAILED]', { code: code2, error: err2Str, retry_index: i });
                // short wait before next loop
                await sleep(750);
              }
            }
          } catch {
            // swallow; will continue showing preparing UI
          }
          return;
        }
        if (apiErr === 'max_attempts_reached') {
          // Try to redirect to the most recent attempt results for this user/course
          try {
            const userId = localStorage.getItem('demo_user_id') || 'u_123';
            const list = await examApi.attemptsByUser(userId);
            const candidates = Array.isArray(list) ? list.filter(a => a.exam_type === 'postcourse') : [];
            // Prefer the last submitted attempt for this exam
            const latest = candidates.find(a => String(a?.exam_id) === String(examId)) || candidates[0];
            if (latest?.attempt_id) {
              navigate(`/results/postcourse/${encodeURIComponent(latest.attempt_id)}`);
              return;
            }
          } catch {}
        }
        setError(apiErr || 'Failed to start post-course exam');
      } finally {
        setQuestionsLoading(false);
      }
    }
    startIfReady();
    return () => { cancelled = true; };
  }, [examId, attemptId, examReady, navigate]);

  // DevLab answers bridge removed; DevLab graded asynchronously server-side

  // Countdown timer
  useEffect(() => {
    if (!Number.isFinite(remainingSec) || remainingSec == null) return;
    let cancelled = false;
    const id = setInterval(() => {
      if (cancelled) return;
      setRemainingSec((s) => {
        if (s == null) return s;
        const next = s - 1;
        if (next <= 0) {
          clearInterval(id);
          // Auto-submit or block
          handleSubmit().catch(() => {});
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [remainingSec]);

  useEffect(() => {
    if (!attemptId || !examId) return;
    let mounted = true;
    proctoringListenersEnabledRef.current = true;

    function addStrike(reason) {
      if (!proctoringListenersEnabledRef.current) return;
      if (!mounted) return;
      setStrikes((prev) => {
        const next = prev + 1;
        try {
          http.post(`/api/proctoring/${encodeURIComponent(attemptId)}/incident`, {
            type: reason,
            strike: next,
            timestamp: new Date().toISOString(),
          }).catch(() => {});
        } catch {}
        if (next >= 3) {
          try {
            http.post(`/api/exams/${encodeURIComponent(examId)}/cancel`, { attempt_id: attemptId }).catch(() => {});
          } catch {}
          navigate('/exam/cancelled');
        }
        return next;
      });
    }

    const handleBlur = () => addStrike('window-blur');
    const handleVisibility = () => {
      try {
        if (document.visibilityState === 'hidden') {
          addStrike('tab-switch');
        }
      } catch {}
    };
    const handleResize = () => {
      try {
        if (window.outerWidth < 300 || window.outerHeight < 300) {
          addStrike('window-minimize');
        }
      } catch {}
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('resize', handleResize);
    removeProctorListenersRef.current = () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('resize', handleResize);
    };

    return () => {
      mounted = false;
      removeProctorListenersRef.current();
    };
  }, [attemptId, examId, navigate]);

  function handleAnswer(id, value) {
    setAnswers((s) => ({ ...s, [id]: value }));
  }

  // Navigation-based counter
  const currentIndexDisplay = currentIdx + 1;

  function goPrev() {
    setCurrentIdx((i) => Math.max(0, i - 1));
  }
  function goNext() {
    setCurrentIdx((i) => {
      const next = Math.min(Math.max(0, questions.length - 1), i + 1);
      if (next >= questions.length - 1 && i === questions.length - 1) {
        setStage('coding');
      }
      return next;
    });
  }

  async function handleSubmit() {
    try {
      // eslint-disable-next-line no-console
      console.log('[POSTCOURSE][SUBMIT][CLICK]');
      if (isSubmittingRef.current) {
        // eslint-disable-next-line no-console
        console.log('[POSTCOURSE][SUBMIT][IGNORED_IS_SUBMITTING]', { isSubmitting: true });
        return;
      }
      // Immediate submit loading UI (Baseline parity)
      setIsSubmitting(true);
      isSubmittingRef.current = true;
      // Prevent integrity listeners from firing during terminal submission
      disableProctoringListeners();
      const payloadAnswers = questions.map((q) => ({
        question_id: q.originalId,
        type: q.type === 'text' ? 'open' : q.type,
        skill_id: q.skill_id || '',
        answer: answers[q.id] ?? '',
      }));
      // eslint-disable-next-line no-console
      console.log('[POSTCOURSE][SUBMIT][REQUEST_SENT]', { examId, attemptId, answersCount: payloadAnswers.length });
      const result = await examApi.submit(examId, {
        attempt_id: attemptId,
        answers: payloadAnswers,
      });
      if (result && result.status === 'PENDING_CODING') {
        // Poll attempt until coding grading completes (Baseline parity)
        let attempts = 0;
        while (attempts < 60) {
          await new Promise((r) => setTimeout(r, 2000));
          const res = await examApi.attempt(attemptId);
          if (res && res.status === 'PENDING_CODING') {
            attempts += 1;
            continue;
          }
          if (res && res.status === 'CANCELED') {
            navigate('/exam/cancelled', { replace: true, state: { message: 'Exam canceled due to phone detection' } });
            return;
          }
          // Use same route style as Baseline (supports :attemptId and ?attemptId)
          navigate(`/results/postcourse/${encodeURIComponent(attemptId)}`, { state: { result: res } });
          return;
        }
        navigate(`/results/postcourse/${encodeURIComponent(attemptId)}`);
        return;
      }
      if (result && result.status === 'CANCELED') {
        navigate('/exam/cancelled', { replace: true, state: { message: 'Exam canceled due to phone detection' } });
        return;
      }
      navigate(`/results/postcourse/${encodeURIComponent(attemptId)}`, { state: { result } });
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Submit failed');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }

  // Camera callbacks
  const handleCameraReady = useCallback(() => {
    setCameraReady(true);
    hasStreamRef.current = true;
  }, []);
  const handleCameraError = useCallback((message) => {
    setCameraError(message || 'Camera access failed');
    setCameraReady(false);
    setCameraOk(false);
    try {
      const msg = String(message || '').toLowerCase();
      if (msg.includes('notallowed') || msg.includes('permission denied') || msg.includes('denied')) {
        setPermissionDenied(true);
      }
    } catch {}
  }, []);
  const handlePhoneDetected = useCallback(() => {
    // Report incident only; NEVER gate /start or control navigation/stage
    try {
      if (attemptId) {
        http.post(`/api/proctoring/${encodeURIComponent(attemptId)}/incident`, {
          type: 'phone-detected',
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }
      // eslint-disable-next-line no-console
      console.log('[POSTCOURSE][PHONE][DETECTED][REPORTED]', { attemptId });
    } catch {}
  }, [attemptId]);

  // Start proctoring once when all prerequisites are ready
  useEffect(() => {
    if (!attemptId) return;
    if (!examReady) return; // Do NOT start proctoring before exam is READY
    if (!cameraReady) return;
    if (proctoringStartedRef.current) return;
    let canceled = false;
    (async () => {
      try {
        // eslint-disable-next-line no-console
        console.log('[POSTCOURSE][PROCTORING][START][CALLING]', { examId, attemptId, cameraReady });
        await examApi.proctoringStartForExam(examId, { attempt_id: attemptId });
        if (canceled) return;
        proctoringStartedRef.current = true;
        setCameraOk(true);
        // eslint-disable-next-line no-console
        console.log('[POSTCOURSE][PROCTORING][START][OK]', { examId, attemptId });
      } catch (e) {
        if (canceled) return;
        setCameraOk(false);
        setCameraError(e?.response?.data?.error || e?.message || 'Failed to activate proctoring');
        // eslint-disable-next-line no-console
        console.log('[POSTCOURSE][PROCTORING][START][ERROR]', e?.response?.data?.error || e?.message || e);
      }
    })();
    return () => { canceled = true; };
  }, [attemptId, examId, cameraReady, examReady]);

  useEffect(() => {
    console.log("🔥 FRONTEND attemptId =", attemptId);
  }, [attemptId]);

  // Diagnostic: camera effective readiness (does not gate UI)
  useEffect(() => {
    const hasStream = !!(cameraReady || hasStreamRef.current);
    const permissionGranted = !permissionDenied;
    const proctoringStarted = !!proctoringStartedRef.current;
    // eslint-disable-next-line no-console
    console.log('[POSTCOURSE][CAMERA][EFFECTIVE_READY]', { hasStream, permissionGranted, proctoringStarted });
  }, [cameraReady, permissionDenied, cameraOk]);

  // Diagnostic: submit stage entered
  useEffect(() => {
    if (stage === 'submit') {
      try {
        // eslint-disable-next-line no-console
        console.log('[POSTCOURSE][SUBMIT][GATE]', {
          cameraOk,
          hasCoding,
          devlabCompleted,
          proctoringStarted: !!proctoringStartedRef.current,
        });
      } catch {}
    }
  }, [stage, cameraOk, hasCoding, devlabCompleted]);

  // Log mount/unmount of DevLab iframe wrapper to ensure stability (no remount loops)
  useEffect(() => {
    if (typeof devlabHtml === 'string' && devlabHtml.trim() !== '') {
      // eslint-disable-next-line no-console
      console.log('[POSTCOURSE][DEVLAB][WRAPPER_MOUNT]');
      return () => {
        // eslint-disable-next-line no-console
        console.log('[POSTCOURSE][DEVLAB][WRAPPER_UNMOUNT]');
      };
    }
    return undefined;
  }, [devlabHtml]);

  // Memoize the iframe element so frequent state updates elsewhere don't remount it
  const devlabIframe = useMemo(() => {
    if (typeof devlabHtml === 'string' && devlabHtml.trim() !== '') {
      return (
        <iframe
          title="Coding Widget"
          srcDoc={devlabHtml}
          style={{ width: '100%', height: '700px', border: '0', borderRadius: '12px' }}
          sandbox="allow-scripts allow-forms allow-same-origin"
        />
      );
    }
    return null;
  }, [devlabHtml]);

  if (loading && !attemptId) return <LoadingSpinner label="Initializing post-course exam..." />;

  return (
    <div className="container-safe py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Post-Course Exam</h2>
        <div className="flex items-center gap-4">
          <div className="text-xs text-neutral-400">
            Camera: {cameraReady && cameraOk ? 'active' : (cameraError ? 'error' : 'starting...')}
          </div>
          {stage === 'theory' && (
            <div className="text-sm text-neutral-300">
              {answeredCount}/{totalCount} answered
            </div>
          )}
          <div className="px-3 py-1 rounded-md bg-emerald-900/50 border border-emerald-700 text-emerald-200 font-mono">
            {Number.isFinite(remainingSec) && remainingSec != null
              ? new Date(remainingSec * 1000).toISOString().substr(11, 8)
              : '--:--:--'}
          </div>
          {attemptId && (
            <div className="w-56">
              <CameraPreview onReady={handleCameraReady} onError={handleCameraError} attemptId={attemptId} onPhoneDetected={handlePhoneDetected} />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/60 text-red-200 p-3">
          {error}
        </div>
      )}
      {cameraError && (
        <div className="rounded-xl border border-yellow-900 bg-yellow-950/60 text-yellow-200 p-3">
          {cameraError}
        </div>
      )}

      {!examCanceled && questions.length > 0 && stage === 'theory' && (
        <div className="space-y-5">
          <motion.div
            key={questions[currentIdx].id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <QuestionCard
              question={questions[currentIdx]}
              value={answers[questions[currentIdx].id] || ''}
              onChange={handleAnswer}
            />
          </motion.div>
          <div className="flex items-center justify-between">
            <div className="min-w-[96px]">
              {currentIdx > 0 && (
                <button
                  className="btn-secondary"
                  onClick={goPrev}
                >
                  Previous
                </button>
              )}
            </div>
            <div className="text-gray-400 text-sm">
              Question {currentIndexDisplay} of {questions.length}
            </div>
            <button className="btn-emerald" onClick={goNext} disabled={questionsLoading || isSubmitting}>
              Next
            </button>
          </div>
        </div>
      )}

      {!examCanceled && questions.length === 0 && stage !== 'coding' && (
        (permissionDenied && !cameraOk) ? (
          <div className="text-sm text-neutral-400">
            Camera access is required to start the exam. Please allow camera access to continue.
          </div>
        ) : (
          <LoadingSpinner label="Preparing questions..." />
        )
      )}

      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-emerald-900/40 border border-emerald-700 rounded-xl p-6 w-[320px] text-center">
            <LoadingSpinner label="Submitting exam..." />
          </div>
        </div>
      )}

      {!examCanceled && stage === 'coding' && typeof devlabHtml === 'string' && devlabHtml.trim() !== '' && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3">Coding</h3>
          {devlabIframe}
          <div className="mt-4 flex justify-end">
            <button className="btn-emerald" onClick={() => setStage('submit')} disabled={isSubmitting}>
              Proceed to Submit
            </button>
          </div>
        </div>
      )}

      {!examCanceled && stage === 'submit' && (
        <div className="mt-8 flex items-center justify-center">
          <button
            className="btn-emerald px-8 py-3 text-lg"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (hasCoding && !devlabCompleted)
            }
          >
            Submit Exam
          </button>
        </div>
      )}

      {examCanceled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-6 w-[360px] text-center text-red-100">
            <div className="text-lg font-semibold mb-2">Exam canceled</div>
            <div className="text-sm">{cancelMessage || 'Exam canceled due to policy violation'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
