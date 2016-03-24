/**
 * PaymentBeginController
 *
 * @description :: Returns a payment account #
 */

module.exports = {

	create: function(req, res) {

		// if there's NO payment account in session, create a new one
		if(!req.session.payment) {

			console.log(TimestampService.utc() + ' No payment account found in session...');
			console.log(TimestampService.utc() + ' payment_begin hit');

			PaymentBeginService.init(function(err, resp) {

				console.log(TimestampService.utc() + ' payment_begin responded');

				if(!err) {
					
					console.log(TimestampService.utc() + ' payment_begin success');

					// store in payment account in session
					req.session.payment = {
						account: resp.response.account
					};

					// return new or existing payment account
					res.send({ account: req.session.payment.account });
				} else {
					console.log(TimestampService.utc() + ' payment_begin error');
					res.send(err);
				}
			});
		} else {
			console.log(TimestampService.utc() + ' A payment account was found in session...');
			console.log(TimestampService.utc() + ' Skipping PaymentBeginService');
			res.send({ account: req.session.payment.account });
		}
	}
};