import { useEffect, useRef } from 'react';

export default function DevLabWidget({ widget, iframeRef }) {
  const localRef = useRef(null);
  const ref = iframeRef || localRef;

  if (!widget || (!widget.url && !widget.srcdoc)) return null;

  return (
    <div className="mt-6">
      <iframe
        ref={ref}
        src={widget.mode === 'iframe' ? widget.url : undefined}
        srcDoc={widget.mode === 'srcdoc' ? widget.srcdoc : undefined}
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
        style={{ width: '100%', minHeight: 800, border: 'none' }}
        title="DevLab Coding Questions"
      />
    </div>
  );
}


