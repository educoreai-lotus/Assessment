import React, { useEffect, useRef } from 'react';

export default function ProctorMonitor() {
  const videoRef = useRef(null);
  const API_BASE = import.meta.env.VITE_API_BASE || 'https://assessment-tests-production.up.railway.app/api/v1';

  async function logEvent(eventType) {
    try {
      await fetch(`${API_BASE}/proctor/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-token',
        },
        body: JSON.stringify({ eventType, timestamp: Date.now() }),
      });
    } catch (_) {
      // ignore
    }
  }

  useEffect(() => {
    function onVis() {
      if (document.hidden) logEvent('TAB_SWITCH');
    }
    document.addEventListener('visibilitychange', onVis);
    let stream;
    navigator.mediaDevices?.getUserMedia?.({ video: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => logEvent('CAMERA_DENIED'));
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, width: 160, height: 90, opacity: 0.6, pointerEvents: 'none' }}>
      <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', borderRadius: 8, background: '#000' }} />
      <div style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, color: '#fff' }}>AI Proctor Active</div>
    </div>
  );
}


