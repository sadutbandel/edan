/**
 * PaymentWaitController
 *
 * @description :: 
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	create: function(req, res) {
		
		console.log(Timestamp.utc() + ' payment_wait hit');
		PaymentWaitService.init(req.session.payment.account, function(err, resp) {

			console.log(Timestamp.utc() + ' payment_wait responded');
			if(!err) {

				console.log(Timestamp.utc() + ' payment_wait success');

				if(resp.statusCode === 200) {

					if(resp.status !== 'nothing') {

						console.log(Timestamp.utc() + ' payment_wait response code 200 and status === \'success\'');

						// send the account back for finishing
						resp.account = req.session.payment.account;

						// remove the account from session immediately
						// this is so that the user can restart the demo immediately
						// without needing to wait for the server to complete the prior
						delete req.session.payment;
						resp.response.paid = true;
					}
					else {
						resp.response.paid = false;
					}
					console.log(Timestamp.utc() + ' --- ');
					console.log(resp);
					res.send(resp);
				}
				else {
					console.log(Timestamp.utc() + ' payment_wait non-200 response code');
					res.send('Non-200 Response Code' + resp.statusCode);
				}
			} else {
				console.log(Timestamp.utc() + ' payment_wait error');
				res.send(err);
			}
		});
	}
};