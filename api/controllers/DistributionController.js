/**
 * DistributionController.js
 * 
 * 
 * Returns a response object with properties:
 *
 * 'message' (required)
 * 'wait' (optional) a duration to wait in seconds
 * 
 */

module.exports = {

	// overrides default POST method
	create: function (req, res) {

		// create payload
		this.parameters = {
			account: req.body.account,
			response: req.body.response,
			modified: TimestampService.unix(),
			sessionID: req.sessionID,
			sessionStarted: req.session.started,
			ip: req.headers['x-forwarded-for']
		};

		// send request for free rai distribution
		Distribution.request(this.parameters, function(err, resp) {
			
			// processed
			if(!err) {
				console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' (success) ' + JSON.stringify(resp));
				res.send(resp);

			} else { // not processed
				console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' (errors!) ' + JSON.stringify(err));
				res.send(err);
			}
		});
	}
};