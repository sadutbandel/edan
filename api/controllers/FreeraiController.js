/**
 * FreeCoinsController
 *
 * @description :: Server-side logic for managing freecoins
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	// override the POST/create route/action for this API call
	create: function (req, res) {
		
		// how long has passed since they were first issued a new session?
		var duration = TimestampService.unix() - req.session.started;

		// has 60 passed since their session was created?
		if(duration >= 60) {

			// 2 required parameters (account, response)
			this.parameters = {
				account: req.body.account,
				response: req.body.response,
				unixtime: TimestampService.unix(),
				sessionID: req.sessionID, // wowdick
				ip: req.headers['x-forwarded-for']
			};

			FreeRai.processRequest(this.parameters, function(err, resp) {

				if(!err) {
					console.log(resp);
					resp.response.message = 'claimed';
					res.send(resp);
				} else {
					console.log(err);
					res.send(err);
				}
			});
		} 
		// if 60 seconds has not passed, return 'premature' response message
		else {
			res.send({ message: 'premature' });
		}
	}
};