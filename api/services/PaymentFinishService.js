/**
 * PaymentFinishService.js is purely account baalnce + recapture funds + payment_end
 */

module.exports = {

	init: function(account, callback) {

		// grab balance of account
		AccountBalanceService.init(account, function(err, resp) {

			if(!err) {

				// pass balance of account and account to recapture service
				PaymentRecaptureService.init({ account: account, balance: resp.response.balance }, function(err, resp) {

					if(!err) {

						// end payment account
						PaymentEndService.init(account, function(err, resp) {

							if(!err) {
								callback(null, resp);
							} else {
								console.log(TimestampService.utc() + ' [PaymentFinishService.js] (err) payment_end error... ' + JSON.stringify(err));
								callback(err, null);
							}
						});
					} else {
						console.log(TimestampService.utc() + ' [PaymentFinishService.js] (err) error recapturing payment... ' + JSON.stringify(err));
						callback(err, null);
					}
				});
			} else {
				console.log(TimestampService.utc() + ' [PaymentFinishService.js] (err) account_balance error... ' + JSON.stringify(err));
				callback(err, null);
			}
		});
	}
};