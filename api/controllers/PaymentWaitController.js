/**
 * PaymentWaitController
 *
 * @description :: Begin waiting on a payment account to receive a payment.
 *              
 */

module.exports = {

	create: function(req, res) {
		
		if(req.session.payment) {

			PaymentWaitService.init(req.session.payment.account, function(err, resp) {
				if(!err) {

					if(resp.statusCode === 200) {

						if(resp.response.status === 'success') {

							// send the account back for finishing
							resp.account = req.session.payment.account;

							// remove the account from session immediately
							// this is so that the user can restart the demo immediately
							// without needing to wait for the server to complete the prior
							delete req.session.payment;
							resp.response.paid = true;
							res.send(resp);
						} else {
							resp.response.paid = false;
							res.send(resp);
						}
					} else {
						console.log(TimestampService.utc() + ' [PaymentWaitController.js] (err) payment_wait error... ' + JSON.stringify(resp));
						res.send('Non-200 Response Code' + resp.statusCode);// <<<<<<<< ???????????????????????????????
					}
				} else {
					console.log(TimestampService.utc() + ' [PaymentWaitController.js] (err) payment_wait error... ' + JSON.stringify(err));
					res.send(err);
				}
			});
		} else {
			res.send({ statusCode: 400, response: 'faucetoff'});
		}
	}
};