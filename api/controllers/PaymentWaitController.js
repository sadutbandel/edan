/**
 * PaymentWaitController
 *
 * @description :: 
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	create: function(req, res) {

		console.log('Payment Wait Controller');

		PaymentWaitService.init(req.session.payment.account, function(err, resp) {

			if(!err) {

				if(resp.statusCode === 200) {

					if(resp.status !== 'nothing') {
						// send the account back for finishing
						resp.account = req.session.payment.account;
						// remove the account from session immediately
						// this is so that the user can restart the demo immediately
						// without needing to wait for the server to complete the prior
						req.session.payment = undefined;
						resp.paid = true;
					}
					else {
						resp.paid = false;
					}

					res.send(resp);
				}
				else {
					res.send('Different response status than 200 - Code ' + resp.statusCode);
				}
			} else {
				res.send(err);
			}
		});
	}
};