/**
 * PaymentBeginController
 *
 * @description :: Returns a payment account #
 */

module.exports = {

	create: function(req, res) {

		// if there's NO payment account in session, create a new one
		if(!req.session.payment) {

			console.log('No payment account found');
			console.log('PaymentBeginService');
			PaymentBeginService.init(function(err, resp) {

				if(!err) {
					
					console.log('PaymentBeginService SUCCESS');

					// store in payment account in session
					req.session.payment = {
						account: resp.account
					};

					// return new or existing payment account
					res.send({ account: req.session.payment.account });
				} else {
					console.log('PaymentBeginService ERROR');
					res.send(err);
				}
			});
		} else {
			console.log('Payment account found');
			console.log('Skipping PaymentBeginService');
			res.send({ account: req.session.payment.account });
		}
	}
};