/**
 * TotalsController.js
 *
 * Handles Faucet solves
 */

module.exports = {

	create: function (req, res) {

		// dev-only
		if(req.headers['x-forwarded-for'] === '96.247.120.158') {

			Totals.request({
				account: req.body.account,
				response: req.body.response,
				modified: TimestampService.unix(),
				sessionID: req.sessionID,
				sessionStarted: req.session.started,
				ip: req.headers['x-forwarded-for']
			}, function(err, resp) {

				if(!err) {
					console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' (success) ' + JSON.stringify(resp));
					res.send(resp);
				} else {
					console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' (errors!) ' + JSON.stringify(err));
					res.send(err);
				}
			});
		} else {
			res.send({ message: 'faucetoff' });
		}
	}
};