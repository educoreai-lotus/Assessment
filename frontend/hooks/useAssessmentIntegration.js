import { useCallback, useState } from 'react';
import { assessmentService } from '../services/assessmentService';

export function useAssessmentIntegration() {
	const [loading, setLoading] = useState(false);
	const [data, setData] = useState(null);
	const [error, setError] = useState(null);

	const postIntegration = useCallback(async (apiCaller, payload) => {
		setLoading(true);
		setError(null);
		try {
			const res = await assessmentService.postIntegration(apiCaller, payload);
			setData(res);
			return res;
		} catch (e) {
			setError(e?.response?.data || { error: e?.message || 'request_failed' });
			throw e;
		} finally {
			setLoading(false);
		}
	}, []);

	const getIntegration = useCallback(async (apiCaller, payload) => {
		setLoading(true);
		setError(null);
		try {
			const res = await assessmentService.getIntegration(apiCaller, payload);
			setData(res);
			return res;
		} catch (e) {
			setError(e?.response?.data || { error: e?.message || 'request_failed' });
			throw e;
		} finally {
			setLoading(false);
		}
	}, []);

	return { loading, data, error, postIntegration, getIntegration };
}


