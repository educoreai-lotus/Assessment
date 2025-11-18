import { useEffect, useRef } from 'react';

export default function CameraPreview({ onReady, onError }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

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

