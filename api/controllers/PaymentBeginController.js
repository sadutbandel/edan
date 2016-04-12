/**
 * PaymentBeginController
 *
 * @description :: Returns a payment account #
 */

module.exports = {

	create: function(req, res) {

		// if there's NO payment account in session, create a new one
		if(!req.session.payment) {

			PaymentBeginService.init(function(err, resp) {

				if(!err) {

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
			res.send({ account: req.session.payment.account });
		}
	}
};