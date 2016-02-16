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

				console.log('AccountBalanceService SUCCESS');

				// pass balance of account and account to recapture service
				PaymentRecaptureService.init({ account: account, balance: resp.balance }, function(err, resp) {

					console.log('PaymentRecaptureService');
					console.log(resp);

					if(!err) {

						console.log('PaymentRecaptureService SUCCESS');
						// end payment account
						PaymentEndService.init(account, function(err, resp) {

							console.log('PaymentEndService');
							console.log(resp);

							if(!err) {
								console.log('PaymentEndService SUCCESS');
								callback(null, resp);
							} else {
								console.log('PaymentEndService ERROR');
								callback(err, null);
							}
						});
					} else {
						console.log('PaymentRecaptureService ERROR');
						callback(err, null);
					}
				});
			} else {
				console.log('AccountBalanceService ERROR');
				callback(err, null);
			}
		});
	}
};