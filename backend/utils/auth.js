function requireScope(scope) {
	return (req, res, next) => {
		const sendError = (http, code, message) => res.status(http).json({ error: code, message });
		const auth = req.headers.authorization || '';
		if (!auth.startsWith('Bearer ')) {
			return sendError(401, 'unauthorized', 'Missing bearer token');
		}
		const token = auth.slice('Bearer '.length);
		if (token !== 'demo-token') {
			return sendError(403, 'forbidden', 'Invalid or insufficient token');
		}
		req.user = { sub: 'demo-user', scopes: ['submit:assessments', 'manage:assessments', 'view:results'], org_id: 'demo-org' };
		if (scope && !req.user.scopes.includes(scope)) {
			return sendError(403, 'forbidden', 'Insufficient scope');
		}
		next();
	};
}

module.exports = { requireScope };


