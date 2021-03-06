/**
 * TotalsController.js
 *
 * Handles Faucet solves
 */

module.exports = {

	create: function (req, res) {

		// dev-only
		if(req.ip === '96.247.120.158' || req.ip === '72.10.62.12') {
			
			Totals.request({
				account: req.body.account,
				response: req.body.response,
				modified: TimestampService.unix(),
				sessionID: req.sessionID,
				sessionStarted: req.session.started,
				ip: req.ip
			}, function(err, resp) {

				if(!err) {
					res.send(resp);
				} else {
					console.log(TimestampService.utc() + ' ' + req.ip + ' ' + req.sessionID + ' (errors!) ' + JSON.stringify(err));
					res.send(err);
				}
			});
		} else {
			res.send({ message: 'faucetoff' });
		}
	}
};