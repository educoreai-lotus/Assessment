export default function IncidentViewer({ incidents = [] }) {
  return (
    <div className="card p-5">
      <div className="mb-2 text-sm text-emeraldbrand-300">RAG Incidents</div>
      <ul className="space-y-3">
        {incidents.length === 0 && <li className="text-neutral-400 text-sm">No incidents.</li>}
        {incidents.map((inc, i) => (
          <li key={i} className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="font-medium">{inc.title || `Incident #${i + 1}`}</span>
              <span className="text-xs text-neutral-400">{inc.severity || 'info'}</span>
            </div>
            <p className="text-sm text-neutral-300 mt-1">{inc.summary || '—'}</p>
            {inc.decision && <p className="text-xs mt-2 text-emeraldbrand-300">Decision: {inc.decision}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}


