/**
 * PaymentFinishController
 *
 * @description :: This controller recaptures funds from a fulfilled payment account, then ends the payment.
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	create: function(req, res) {

		console.log('PaymentFinishService');
		PaymentFinishService.init(req.body.account, function(err, resp) {

			console.log(resp);

			if(!err) {

				if(resp.statusCode === 200) {

					console.log('PaymentFinishService SUCCESS');
					delete req.session.payment;
					console.log('Payment account cleared from session!');
					res.send(resp);
				}
				else {
					console.log('PaymentFinishService Non-200 Response Code');
					res.send('Non-200 Response Code' + resp.statusCode);
				}
				
			} else {
				console.log('PaymentFinishService ERROR');
				res.send(err);
			}
		});
	}
};