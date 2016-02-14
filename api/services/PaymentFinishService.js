/**
 * paymentFinishService.js is purely account baalnce + recapture funds + payment_end
 */

module.exports = {

	init: function(account, callback) {

		// grab balance of account
		AccountBalanceService.init(account, function(err, resp) {

			console.log('AccountBalanceService');
			console.log(resp);

			if(!err) {

				// pass balance of account and account to recapture service
				PaymentRecaptureService.init({ account: account, balance: resp.balance }, function(err, resp) {

					console.log('PaymentRecaptureService');
					console.log(resp);

					if(!err) {

						// end payment account
						PaymentEndService.init(account, function(err, resp) {

							console.log('PaymentEndService');
							console.log(resp);

							if(!err) {
								callback(null, resp);
							} else {
								callback(err, null);
							}
						});
					} else {
						callback(err, null);
					}
				});
			} else {
				callback(err, null);
			}
		});
	}
};