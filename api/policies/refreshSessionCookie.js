module.exports = function(req, res, next) {
	req.session.touch();
	return next();
}