/**
 * PaymentBeginController
 *
 * @description :: Returns a payment account #
 */

module.exports = {

	create: function(req, res) {

		console.log('Payment Begin Controller');

		// if there's NO payment account in session, create a new one
		if(!req.session.payment) {

			console.log('No payment account found');

			PaymentBeginService.init(function(err, resp) {

				if(!err) {

					// store in payment account in session
					req.session.payment = {
						account: resp.account
					};

					// return new or existing payment account
					res.send({ account: req.session.payment.account });
				}
			});
		} else {
			console.log('Payment account found');
			res.send({ account: req.session.payment.account });
		}
	}
};