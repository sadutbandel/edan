/**
 * FreeCoinsController
 *
 * @description :: Server-side logic for managing freecoins
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	// override the POST/create route/action for this API call
	create: function (req, res) {
		
		// first, ensure the end-user has waited 300 since their session first started
		WowDick.checkExpired(req.session.started, function(err, resp) {
			if(!err) {
				console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' [FreeraiController.js] (!err) checking if initial page-load session is expired... ');
				
				// 2 required parameters (account, response)
				this.parameters = {
					account: req.body.account,
					response: req.body.response,
					unixtime: TimestampService.unix(),
					sessionID: req.sessionID,
					ip: req.headers['x-forwarded-for']
				};

				FreeRai.processRequest(this.parameters, function(err, resp) {
					// not a dick
					if(!err) {
						console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' [FreeraiController.js] (!err) FreeRai.processRequest()...  ');
						resp.response.message = 'claimed';
						res.send(resp);
					} else { // being a dick
						console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' [FreeraiController.js] (err) FreeRai.processRequest()...  ' + JSON.stringify(err));
						res.send(err);
					}
				});
			} else {
				console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' [FreeraiController.js] (err) checking if initial page-load session is expired... ' + JSON.stringify(err));
				res.send({ message: 'premature', wait: err });
			}
		});
	}
};