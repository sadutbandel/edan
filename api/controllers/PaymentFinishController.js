/**
 * PaymentFinishController
 *
 * @description :: This controller recaptures funds from a fulfilled payment account, then ends the payment.
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	create: function(req, res) {

		console.log('Payment Finish Controller');

		PaymentFinishService.init(req.body.account, function(err, resp) {

			if(!err) {
				res.send(resp);
			} else {
				res.send(err);
			}
		});
	}
};