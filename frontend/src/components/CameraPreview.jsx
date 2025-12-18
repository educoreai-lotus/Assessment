import { useEffect, useRef } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

export default function CameraPreview({ onReady, onError, attemptId, onPhoneDetected }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const intervalRef = useRef(null);
  const phoneDetectedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (!mounted) {
          try {
            media.getTracks().forEach((t) => t.stop());
          } catch {}
          return;
        }
        streamRef.current = media;
        const video = videoRef.current;
        if (video) {
          try {
            video.srcObject = media;
            await video.play();
          } catch {}
        }
        onReady?.();

        // Start phone detection loop after camera is active
        try {
          // Load model once
          if (!detectorRef.current) {
            detectorRef.current = await cocoSsd.load();
          }
          // Poll every ~900ms
          if (!intervalRef.current && detectorRef.current && videoRef.current) {
            intervalRef.current = setInterval(async () => {
              if (!mounted) return;
              if (phoneDetectedRef.current) return;
              const videoEl = videoRef.current;
              if (!videoEl) return;
              try {
                const predictions = await detectorRef.current.detect(videoEl);
                const phone = Array.isArray(predictions)
                  ? predictions.find((p) => p && p.class === 'cell phone' && Number(p.score || 0) >= 0.6)
                  : null;
                if (phone && attemptId) {
                  phoneDetectedRef.current = true;
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                  }
                  try {
                    await fetch(`/api/proctoring/${encodeURIComponent(attemptId)}/incident`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'phone_detected' }),
                    }).catch(() => {});
                  } catch {}
                  try {
                    onPhoneDetected?.(phone);
                  } catch {}
                }
              } catch {}
            }, 900);
          }
        } catch {}
      } catch (e) {
        const msg =
          e?.name === 'NotAllowedError'
            ? 'Camera permission denied'
            : e?.message || 'Failed to start camera';
        onError?.(msg);
      }
    }

    startCamera();
    return () => {
      mounted = false;
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch {}
    };
  }, []);

  return (
    <div className="relative w-full max-w-sm">
      <div className="rounded-xl overflow-hidden border border-neutral-800 bg-black/60">
        <video
          ref={videoRef}
          className="block w-full h-40 object-cover"
          muted
          playsInline
        />
      </div>
      <div className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded bg-black/70 text-neutral-200 tracking-wide">
        Camera Preview
      </div>
    </div>
  );
}

