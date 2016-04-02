/**
 * PaymentFinishService.js is purely account baalnce + recapture funds + payment_end
 */

module.exports = {

	init: function(account, callback) {

		// grab balance of account
		AccountBalanceService.init(account, function(err, resp) {

			if(!err) {

				console.log(TimestampService.utc() + ' [PaymentFinishService.js] (!err) rpc account_balance... ' + JSON.stringify(resp));

				// pass balance of account and account to recapture service
				PaymentRecaptureService.init({ account: account, balance: resp.response.balance }, function(err, resp) {

					if(!err) {

						console.log(TimestampService.utc() + ' [PaymentFinishService.js] (!err) payment recaptured! ' + JSON.stringify(resp));

						// end payment account
						PaymentEndService.init(account, function(err, resp) {

							if(!err) {
								console.log(TimestampService.utc() + ' [PaymentFinishService.js] (!err) payment_end success... ' + JSON.stringify(resp));
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