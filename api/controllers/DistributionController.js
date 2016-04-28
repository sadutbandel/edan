/**
 * DistributionController.js
 *
 * Create a distribution request. This controller is an important API end-point.
 */

module.exports = {

	create: function (req, res) {

		// only allow my IP to use distribution in dev ( REMOVE BEFORE PUSH )
		//if(req.headers['x-forwarded-for'] == '96.247.120.158' || req.headers['x-forwarded-for'] == '108.253.240.212') {

			res.send({ message: 'faucetoff' });
			/*
			// ensure session is set. non-users won't get sessions (command-line CURLs for example)
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
						//console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' (success) ' + JSON.stringify(resp));
						res.send(resp);
					} else {
						console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' (errors!) ' + JSON.stringify(err));
						res.send(err);
					}
				});
			} else {
				res.send('Goodbye');
			}
			*/
		//}
	}
};