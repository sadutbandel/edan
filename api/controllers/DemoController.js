
/**
 * DemoController
 *
 * @description :: Simulate a payment for the end-user by sending a 1 Mrai payment to the payment account
 */

module.exports = {

	// override the POST/create route/action
	create: function (req, res) {

		this.parameters = {
			account: req.session.payment.account,
		};

		SimulateRaiPaymentService.send(this.parameters, function(err, resp) {
			
			if(!err) {
				res.send(resp);

			} else {
				console.log(TimestampService.utc() + ' [DemoController.js] (err) sending free rai... ' + JSON.stringify(err));
				res.send(err);
			}
		});
	}
};