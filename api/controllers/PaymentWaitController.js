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