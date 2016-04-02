/**
 * PaymentWaitController
 *
 * @description :: 
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	create: function(req, res) {
		
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
						
					} else {
						resp.response.paid = false;
					}

					console.log(TimestampService.utc() + ' [PaymentWaitController.js] (!err) payment_wait success... ' + JSON.stringify(resp));
					res.send(resp);
				} else {
					console.log(TimestampService.utc() + ' [PaymentWaitController.js] (err) payment_wait error... ' + JSON.stringify(resp));
					res.send('Non-200 Response Code' + resp.statusCode);// <<<<<<<< ???????????????????????????????
				}
			} else {
				console.log(TimestampService.utc() + ' [PaymentWaitController.js] (err) payment_wait error... ' + JSON.stringify(err));
				res.send(err);
			}
		});
	}
};