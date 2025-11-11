import React from 'react';
import { useHealth } from '../../hooks/useHealth';

export default function DevHealthPage() {
	const { loading, health, postgres, mongo, error } = useHealth();

	return (
		<div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial', padding: 16 }}>
			<h1>Frontend Integration Checks</h1>
			<p>Status: {loading ? 'Loading…' : 'Ready'}</p>
			{error && <pre style={{ color: 'crimson' }}>{JSON.stringify(error, null, 2)}</pre>}

			<h2>/health</h2>
			<pre>{JSON.stringify(health, null, 2)}</pre>

			<h2>/health/postgres</h2>
			<pre>{JSON.stringify(postgres, null, 2)}</pre>

			<h2>/health/mongo</h2>
			<pre>{JSON.stringify(mongo, null, 2)}</pre>
		</div>
	);
}


