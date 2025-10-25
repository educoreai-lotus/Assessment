module.exports = function userContext(req, res, next) {
	const userFromHeader = req.header('x-user-id');
	const fallback = 'demo-user-1';
	req.user = req.user || {};
	req.user.id = userFromHeader || req.user.sub || fallback;
	return next();
};


