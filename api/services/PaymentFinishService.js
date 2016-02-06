/**
 * paymentFinishService.js is purely payment_end + recapture funds
 */

module.exports = {

	init: function(account, callback) {

		PaymentRecaptureService.init(account, function(err, resp) {

			if(!err) {

				PaymentEndService.init(account, function(err, resp) {

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
	}
};