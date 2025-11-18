import { useEffect, useRef } from 'react';

export default function CameraPreview({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stream) {
      try {
        video.srcObject = stream;
        video.play().catch(() => {});
      } catch {
        // ignore
      }
    } else {
      try {
        video.pause();
        video.srcObject = null;
      } catch {
        // ignore
      }
    }
  }, [stream]);

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


