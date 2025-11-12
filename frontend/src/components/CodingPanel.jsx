export default function CodingPanel({ challenge, onRun }) {
  return (
    <div className="card p-5">
      <div className="mb-2 text-sm text-emeraldbrand-300">DevLab Challenge</div>
      <h3 className="text-lg font-semibold mb-3">{challenge?.title || 'Coding Exercise'}</h3>
      <p className="text-neutral-300 mb-4">{challenge?.description || 'Implement the function to satisfy the tests.'}</p>
      <textarea
        className="w-full font-mono rounded-xl bg-neutral-900 border border-neutral-700 p-3 focus:outline-none focus:ring-2 focus:ring-emeraldbrand-500"
        rows={10}
        placeholder="// Your code here"
      />
      <div className="mt-4 flex justify-end">
        <button className="btn-emerald" onClick={() => onRun?.()}>Run Tests</button>
      </div>
    </div>
  );
}


