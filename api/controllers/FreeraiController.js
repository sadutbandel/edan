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

		if(duration >= 60) {
			// 2 required parameters (account, response)
			this.parameters = {
				account: req.body.account,
				response: req.body.response,
				sessionID: req.sessionID // wowdick
			};

			FreeRai.processRequest(this.parameters, function(err, resp) {

				if(!err) {
					resp.response.message = 'claimed';
					res.send(resp);
				} else {
					res.send(err);
				}
			});
		} else {
			res.send({ message: 'premature' });
		}
	}
};