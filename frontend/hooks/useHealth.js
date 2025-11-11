import { useEffect, useState } from 'react';
import { healthService } from '../services/healthService';

export function useHealth() {
	const [state, setState] = useState({
		loading: true,
		health: null,
		postgres: null,
		mongo: null,
		error: null,
	});

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const [h, pg, mg] = await Promise.allSettled([
					healthService.getHealth(),
					healthService.getPostgres(),
					healthService.getMongo(),
				]);
				if (!mounted) return;
				setState({
					loading: false,
					health: h.status === 'fulfilled' ? h.value : h.reason?.response?.data || { error: String(h.reason) },
					postgres: pg.status === 'fulfilled' ? pg.value : pg.reason?.response?.data || { error: String(pg.reason) },
					mongo: mg.status === 'fulfilled' ? mg.value : mg.reason?.response?.data || { error: String(mg.reason) },
					error: null,
				});
			} catch (err) {
				if (!mounted) return;
				setState((s) => ({ ...s, loading: false, error: err?.message || 'unknown_error' }));
			}
		})();
		return () => { mounted = false; };
	}, []);

	return state;
}


