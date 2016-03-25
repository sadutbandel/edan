/**
 * DemoController
 *
 * @description :: Server-side logic for managing demo payments
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	// override the POST/create route/action for this API call
	create: function (req, res) {

		// 2 required parameters (account, response)
		this.parameters = {
			account: req.session.payment.account,
		};

		// send rai to account
		FreeRaiService.send(this.parameters, function(err, resp) {

			console.log(TimestampService.utc() + ' sending demo payment...');

			if(!err) {

				console.log(TimestampService.utc() + ' --- ');
				console.log(resp);
				res.send(resp);

			} else {

				console.log(TimestampService.utc() + ' --- ');
				console.log(err);
				res.send(err); // demo payment not made...
			}
		});
	}
};