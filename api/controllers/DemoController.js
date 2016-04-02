
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
			
			if(!err) {
				console.log(TimestampService.utc() + ' [DemoController.js] (!err) sending free rai... ' + JSON.stringify(resp));
				res.send(resp); // demo payment made!

			} else {
				console.log(TimestampService.utc() + ' [DemoController.js] (err) sending free rai... ' + JSON.stringify(err));
				res.send(err); // demo payment not made...
			}
		});
	}
};