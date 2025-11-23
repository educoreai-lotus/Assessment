import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { examApi } from '../services/examApi';

export default function PostCourseResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const initialAttemptId = useMemo(() => {
    return params.attemptId || searchParams.get('attemptId') || null;
  }, [params, searchParams]);

  const [attemptId, setAttemptId] = useState(initialAttemptId);
  const [result, setResult] = useState(location?.state?.result || null);
  const [loading, setLoading] = useState(!location?.state?.result);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function fetchIfNeeded() {
      if (result) return;
      if (!attemptId) {
        setError('Missing attemptId');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await examApi.attempt(attemptId);
        if (!mounted) return;
        setResult(data);
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.error || e?.message || 'Failed to load results');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchIfNeeded();
    return () => {
      mounted = false;
    };
  }, [attemptId, result]);

  const grade = Number(result?.final_grade || 0);
  const passingGrade = Number(result?.passing_grade || 70);
  const passed = !!result?.passed;
  const maxAttempts =
    (result?.policy && result.policy?.max_attempts != null ? result.policy.max_attempts : undefined) ??
    (result?.policy_snapshot && result.policy_snapshot?.max_attempts != null ? result.policy_snapshot.max_attempts : undefined) ??
    (result?.max_attempts != null ? result.max_attempts : 'N/A');
  const attemptNumber = result?.attempt_no != null ? result.attempt_no : 'N/A';
  const attemptsUsed = Number(attemptNumber);
  const attemptsLimit = Number(maxAttempts);
  const attemptsRemaining = attemptsLimit - attemptsUsed;
  const hasAttemptsLeft = attemptsRemaining > 0;

  function fmtDate(d) {
    if (!d) return '';
    try {
      const dt = new Date(d);
      return dt.toLocaleString();
    } catch {
      return String(d);
    }
  }

  if (loading) return <LoadingSpinner label="Loading results..." />;

  return (
    <div className="container-safe py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Post-Course Results</h2>
        {attemptId && (
          <div className="text-xs text-neutral-400">Attempt #{attemptId}</div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/60 text-red-200 p-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-sm text-neutral-400">Final Grade</div>
          <div className="text-3xl font-semibold">{grade} / 100</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-neutral-400">Pass/Fail</div>
          <div>
            <span className={`px-3 py-1 text-sm rounded-xl ${passed ? 'bg-emeraldbrand-900 text-emeraldbrand-200' : 'bg-red-950 text-red-200'} border ${passed ? 'border-emeraldbrand-800' : 'border-red-900'}`}>
              {passed ? 'Passed' : 'Failed'}
            </span>
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-neutral-400">Passing Grade</div>
          <div className="text-base">{passingGrade}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-neutral-400">Submitted At</div>
          <div className="text-base">{fmtDate(result?.submitted_at)}</div>
        </div>
      </div>

      <div className="mt-3 text-gray-200 text-sm font-medium">
        Attempt {attemptNumber} of {maxAttempts}
      </div>
      {!hasAttemptsLeft && (
        <div className="text-red-300 text-sm">
          You have used all allowed attempts ({attemptsLimit}/{attemptsLimit}).
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-sm text-neutral-400">Course ID</div>
          <div className="text-base">{result?.course_id != null ? String(result.course_id) : '—'}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-neutral-400">Course Name</div>
          <div className="text-base">{result?.course_name || '—'}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-neutral-400">Attempt No</div>
          <div className="text-base">{result?.attempt_no != null ? String(result.attempt_no) : '—'}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-neutral-400">Max Attempts</div>
          <div className="text-base">{result?.max_attempts != null ? String(result.max_attempts) : '—'}</div>
        </div>
      </div>

      {Array.isArray(result?.skills) && result.skills.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Skills</h3>
          {result.skills.map((s, idx) => {
            const statusOk = String(s?.status || '').toLowerCase() === 'acquired' || s?.score >= passingGrade;
            return (
              <div key={idx} className="card p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-neutral-400">Skill</div>
                  <div className="text-base">{s?.skill_name || s?.skill_id || 'Unknown'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-neutral-400">Score</div>
                  <div className="text-base">{Number(s?.score ?? 0)}</div>
                </div>
                <div>
                  <span className={`px-2 py-0.5 text-xs rounded-xl ${statusOk ? 'bg-emeraldbrand-900 text-emeraldbrand-200' : 'bg-red-950 text-red-200'} border ${statusOk ? 'border-emeraldbrand-800' : 'border-red-900'}`}>
                    {statusOk ? 'acquired' : 'failed'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {result?.coding_results && (
        <div className="card p-5">
          <h3 className="text-lg font-semibold mb-2">Coding Summary</h3>
          <div className="text-sm text-neutral-300">
            Total: {Number(result.coding_results?.score_total || 0)} / {Number(result.coding_results?.score_max || 0)}
          </div>
        </div>
      )}

      {attemptId && !passed && (
        attemptsUsed < attemptsLimit ? (
          <button
            className="mt-4 px-6 py-2 rounded bg-emeraldbrand-800 hover:bg-emeraldbrand-700 text-white"
            onClick={() => {
              try {
                localStorage.removeItem("postcourse_exam_id");
                localStorage.removeItem("postcourse_attempt_id");
                localStorage.removeItem("postcourse_answers");
              } catch {}
              navigate('/exam/postcourse', { replace: true });
            }}
          >
            Retake Exam
          </button>
        ) : (
          <button
            className="mt-4 px-6 py-2 rounded bg-gray-700 text-gray-400 cursor-not-allowed"
            disabled
          >
            Max attempts reached ({attemptsLimit}/{attemptsLimit})
          </button>
        )
      )}
    </div>
  );
}


