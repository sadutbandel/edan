/**
 * Functions for the PaymentDemoController.js
 * */

module.exports = {

	waitPayment: function(account, callback) {

		PaymentDemo.existing(account, function(err, res) {

			if(!err) {

				// usually a 200 is returned
				if(res.statusCode == 200) {

					if(res.status != 'nothing') {

						// recapture the demo funds to our holding address
						PaymentDemo.recapture(account, function(err, res) {

							if(!err) {

								// end the payment
								PaymentDemo.end(account, function(err, res) {
									if(!err) {
										res.paid = true;
										callback(null, res);

									} else {
										callback(err, null);
									}
								});

							} else {
								callback(err, null);
							}
						});
					} 
					// res.status == 'nothing'
					else {
						res.paid = false;
						callback(null, res);
					}
				} else {
					callback('Different response status than 200 - Code ' + res.statusCode);
				}
			} else {
				callback(err, null);
			}
		});
	}
};