/**
 * paymentFinishService.js is purely account baalnce + recapture funds + payment_end
 */

module.exports = {

	init: function(account, callback) {

		console.log(TimestampService.utc() + ' account_balance hit');

		// grab balance of account
		AccountBalanceService.init(account, function(err, resp) {

			console.log(TimestampService.utc() + ' account_balance responded');
			console.log(TimestampService.utc() + ' --- ');
			console.log(resp);

			if(!err) {

				console.log(TimestampService.utc() + ' account_balance success');
				console.log(TimestampService.utc() + ' payment recapture hit');

				// pass balance of account and account to recapture service
				PaymentRecaptureService.init({ account: account, balance: resp.response.balance }, function(err, resp) {

					console.log(TimestampService.utc() + ' payment recapture responded');
					console.log(TimestampService.utc() + ' --- ');
					console.log(resp);

					if(!err) {

						console.log(TimestampService.utc() + ' payment recapture success');
						console.log(TimestampService.utc() + ' payment_end hit');
						// end payment account
						PaymentEndService.init(account, function(err, resp) {

							console.log(TimestampService.utc() + ' payment_end responded');
							console.log(TimestampService.utc() + ' --- ');
							console.log(resp);

							if(!err) {
								console.log(TimestampService.utc() + ' payment_end success');
								callback(null, resp);
							} else {
								console.log(TimestampService.utc() + ' payment_end error');
								callback(err, null);
							}
						});
					} else {
						console.log(TimestampService.utc() + ' payment recapture error');
						callback(err, null);
					}
				});
			} else {
				console.log(TimestampService.utc() + ' account_balance error');
				callback(err, null);
			}
		});
	}
};