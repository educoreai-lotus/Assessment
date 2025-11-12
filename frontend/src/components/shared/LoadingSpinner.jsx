export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-emeraldbrand-400 border-t-transparent mr-3" />
      <span className="text-sm text-neutral-300">{label}</span>
    </div>
  );
}


