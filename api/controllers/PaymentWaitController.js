/**
 * PaymentWaitController
 *
 * @description :: 
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	create: function(req, res) {
		
		console.log('PaymentWaitService');
		PaymentWaitService.init(req.session.payment.account, function(err, resp) {

			if(!err) {

				console.log('PaymentWaitService SUCCESS');

				if(resp.statusCode === 200) {

					console.log('PaymentWaitService RPC SUCCESS');
					if(resp.status !== 'nothing') {
						// send the account back for finishing
						resp.account = req.session.payment.account;
						// remove the account from session immediately
						// this is so that the user can restart the demo immediately
						// without needing to wait for the server to complete the prior
						delete req.session.payment;
						resp.paid = true;
					}
					else {
						resp.paid = false;
					}

					res.send(resp);
				}
				else {
					console.log('PaymentWaitService Non-200 Response Code');
					res.send('Non-200 Response Code' + resp.statusCode);
				}
			} else {
				console.log('PaymentWaitService ERROR');
				res.send(err);
			}
		});
	}
};