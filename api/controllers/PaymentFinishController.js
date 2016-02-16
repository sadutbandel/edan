/**
 * PaymentFinishController
 *
 * @description :: This controller recaptures funds from a fulfilled payment account, then ends the payment.
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	create: function(req, res) {

		console.log(Timestamp.utc() + ' finishing payment');
		PaymentFinishService.init(req.body.account, function(err, resp) {
			
			console.log(Timestamp.utc() + ' finishing payment responded');
			if(!err) {

				if(resp.statusCode === 200) {

					console.log(Timestamp.utc() + ' finishing payment responded');
					delete req.session.payment;
					console.log(Timestamp.utc() + ' Payment account cleared from session!');
					res.send(resp);
				}
				else {
					console.log(Timestamp.utc() + ' finishing payment non-200 response code');
					res.send('Non-200 Response Code' + resp.statusCode);
				}
				
			} else {
				console.log(Timestamp.utc() + ' finishing error');
				res.send(err);
			}
		});
	}
};