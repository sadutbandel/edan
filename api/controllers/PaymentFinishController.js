/**
 * PaymentFinishController
 *
 * @description :: This controller recaptures funds from a fulfilled payment account, then ends the payment.
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	create: function(req, res) {

		console.log('Payment Finish Controller');
		console.log('PaymentFinishService');
		PaymentFinishService.init(req.body.account, function(err, resp) {

			if(!err) {
				console.log('PaymentFinishService SUCCESS');
				res.send(resp);
			} else {
				console.log('PaymentFinishService ERROR');
				res.send(err);
			}
		});
	}
};