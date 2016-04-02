/**
 * PaymentFinishController
 *
 * @description :: This controller recaptures funds from a fulfilled payment account, then ends the payment.
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	create: function(req, res) {


		PaymentFinishService.init(req.body.account, function(err, resp) {
			
			if(!err) {

				if(resp.statusCode === 200) {

					delete req.session.payment;
					console.log(TimestampService.utc() + ' [PaymentFinishController.js] (!err) finishing payment... ' + JSON.stringify(resp));
					res.send(resp);
				}
				else {
					console.log(TimestampService.utc() + ' [PaymentFinishController.js] (!err) finishing payment... ' + JSON.stringify(resp));
					res.send('Non-200 Response Code' + resp.statusCode);// <<<<<<<< ???????????????????????????????
				}
				
			} else {
				console.log(TimestampService.utc() + ' [PaymentFinishController.js] (!err) finishing payment... ' + JSON.stringify(err));
				res.send(err);
			}
		});
	}
};