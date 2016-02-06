/**
 * Functions for the DemoController.js
 * */

module.exports = {

	//obj contains account, and req
	waitPayment: function(account, callback) {

		Demo.existing(account, function(err, res) {

			if(!err) {

				// usually a 200 is returned
				if(res.statusCode == 200) {

					if(res.status != 'nothing') {

						// PAID - emit 'paid' true to the client to remove ads
						console.log('Emit paid === true');
						sails.sockets.emit( socketId, 'paid', true);

						// recapture the demo funds to our holding address
						Demo.recapture(account, function(err, res) {

							if(!err) {

								// end the payment
								Demo.end(account, function(err, res) {
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
						console.log('Emit paid === false');
						sails.sockets.emit( socketId, 'paid', false);
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