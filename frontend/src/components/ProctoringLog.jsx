export default function ProctoringLog({ events = [] }) {
  return (
    <div className="card p-5">
      <div className="mb-2 text-sm text-emeraldbrand-300">Protocol Camera Events</div>
      <ul className="space-y-2">
        {events.length === 0 && <li className="text-neutral-400 text-sm">No events recorded.</li>}
        {events.map((e, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="h-2.5 w-2.5 mt-1 rounded-full bg-emeraldbrand-500" />
            <div>
              <div className="text-sm text-white">{e.type}</div>
              <div className="text-xs text-neutral-400">{new Date(e.timestamp || Date.now()).toLocaleString()}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


