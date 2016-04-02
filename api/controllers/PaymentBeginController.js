/**
 * PaymentBeginController
 *
 * @description :: Returns a payment account #
 */

module.exports = {

	create: function(req, res) {

		// if there's NO payment account in session, create a new one
		if(!req.session.payment) {

			console.log(TimestampService.utc() + ' [PaymentBeginController.js] No payment account found in session...');

			PaymentBeginService.init(function(err, resp) {

				if(!err) {
					
					console.log(TimestampService.utc() + ' [PaymentBeginController.js] (!err) beginning payment... ' + JSON.stringify(resp));

					// store in payment account in session
					req.session.payment = {
						account: resp.response.account
					};

					// return new or existing payment account
					res.send({ account: req.session.payment.account });

				} else {
					console.log(TimestampService.utc() + ' [PaymentBeginController.js] (err) beginning payment... ' + JSON.stringify(err));
					res.send({ statusCode: 400, response: 'faucetoff'});
				}
			});
		} else {
			console.log(TimestampService.utc() + ' [PaymentBeginController.js] Payment account found in session, skipping payment_begin...');
			res.send({ account: req.session.payment.account });
		}
	}
};