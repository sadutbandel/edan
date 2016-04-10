/**
 * DistributionController.js
 *
 * Create a distribution request
 */

module.exports = {

	create: function (req, res) {

		if(req.session.started) {

			this.parameters = {
				account: req.body.account,
				response: req.body.response,
				modified: TimestampService.unix(),
				sessionID: req.sessionID,
				sessionStarted: req.session.started,
				ip: req.headers['x-forwarded-for']
			};

			Distribution.request(this.parameters, function(err, resp) {

				if(!err) {
					console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' (success) ' + JSON.stringify(resp));
					res.send(resp);
				} else {
					console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' (errors!) ' + JSON.stringify(err));
					res.send(err);
				}
			});
		} else {
			res.send('Goodbye'); // prevent curl POSTs, they don't have session start times from visiting the site.
		}
	}
};