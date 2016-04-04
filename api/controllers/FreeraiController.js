/**
 * FreeraiController
 * 
 *           { response: { message: 'claimed' }} <<< successful claim
 *           { response: { message: 'premature', wait: 54 }} <<< too early to claim
 *           { response: { message: 'wait' }} <<< try again
 *           
 */

module.exports = {

	// default POST method
	create: function (req, res) {
		res.send({ message: 'faucetoff' });
		// ensure end-user waited 300 seconds (new-session timout)
		/*
		WowDick.checkExpired(req.session.started, function(err, resp) {

			// expired!
			if(!err) {
					
				// create payload
				this.parameters = {
					account: req.body.account,
					response: req.body.response,
					unixtime: TimestampService.unix(),
					sessionID: req.sessionID,
					ip: req.headers['x-forwarded-for']
				};

				// request free rai
				FreeRai.processRequest(this.parameters, function(err, resp) {
					
					// processed
					if(!err) {

						console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' [FreeraiController.js] (!err) FreeRai.processRequest()...  ');
						resp.response.message = 'claimed';
						res.send(resp);

					} else { // not processed

						console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' [FreeraiController.js] (err) FreeRai.processRequest()...  ' + JSON.stringify(err));
						res.send(err);
					}
				});
			} else { // not expired, wait xx seconds (error)
				console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' [FreeraiController.js] (err) checking if initial page-load session is expired... ' + JSON.stringify(err));
				res.send({ message: 'premature', wait: err });
			}
		});
		*/
	}
};