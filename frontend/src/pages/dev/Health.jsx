import { useEffect, useState } from 'react';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { integrationsApi } from '../../services/integrationsApi';

export default function Health() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({ health: null, pg: null, mongo: null });
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.allSettled([integrationsApi.health(), integrationsApi.healthPostgres(), integrationsApi.healthMongo()])
      .then(([h, p, m]) => {
        if (!mounted) return;
        setResults({
          health: h.status === 'fulfilled' ? h.value : { status: h?.reason?.response?.status || 500, data: h?.reason?.response?.data || { error: String(h.reason) } },
          pg: p.status === 'fulfilled' ? p.value : { status: p?.reason?.response?.status || 500, data: p?.reason?.response?.data || { error: String(p.reason) } },
          mongo: m.status === 'fulfilled' ? m.value : { status: m?.reason?.response?.status || 500, data: m?.reason?.response?.data || { error: String(m.reason) } },
        });
      })
      .catch((e) => setError(e?.message || 'Health checks failed'))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <LoadingSpinner label="Checking health..." />;

  return (
    <div className="container-safe py-8 space-y-6">
      <h2 className="text-2xl font-semibold">Integration Health</h2>
      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/60 text-red-200 p-3">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-neutral-400">/health</div>
          <div className="text-xl font-semibold">{results.health?.status}</div>
          <pre className="mt-2 text-xs text-neutral-300 overflow-x-auto">{JSON.stringify(results.health?.data, null, 2)}</pre>
        </div>
        <div className="card p-4">
          <div className="text-sm text-neutral-400">/health/postgres</div>
          <div className="text-xl font-semibold">{results.pg?.status}</div>
          <pre className="mt-2 text-xs text-neutral-300 overflow-x-auto">{JSON.stringify(results.pg?.data, null, 2)}</pre>
        </div>
        <div className="card p-4">
          <div className="text-sm text-neutral-400">/health/mongo</div>
          <div className="text-xl font-semibold">{results.mongo?.status}</div>
          <pre className="mt-2 text-xs text-neutral-300 overflow-x-auto">{JSON.stringify(results.mongo?.data, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}


