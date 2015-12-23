/**
* FreeCoins.js
*
* @description :: Requires an account string, and a recaptcha response string (derives from user-click). processRequest handles everything.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

	attributes: {

		account: {
			type:'string',
			required:true,
			unique: true
		},

		response: {
			type:'string',
			required:true,
			unique: true
		}
	},

	/**
	 * Verifies ...
	 * all passed parameters,
	 * recaptcha response,
	 * account validity
	 */
	
	processRequest: function(parameters, callback) {

		// ensure all parameters are fulfilled
		FreeCoinsService.verifyParameters(parameters, function(err, response) {
			console.log('Verifying parameters...');

			// parameters passed!
			if(!err) {

				console.log(response);

				// ensure the recaptcha response is valid by asking Google
				RecaptchaService.verifyResponse(parameters.response, function(err, response) {
					console.log('Verifying recaptcha...');

					if(!err) {

						// recaptcha passed!
						if(response.success) {

							console.log(response);

							// check if the account is valid
							ValidateAccountService.validate(parameters.account, function(err, response) {
								console.log('Verifying account...');

								if(!err) {

									console.log(response);

									// send rai to account
									FreeCoinsService.send(parameters, function(err, response) {
										console.log('Sending free rai...');

										if(!err) {

											console.log(response);
											callback(null, response);

										} else {

											console.log(err);
											callback(null, err); // free coins were not sent
										}
									});

								} else {
									console.log(err);
									callback(err, null); // account validation failed!
								}
							});

						} else {
							console.log(response);
							callback(response, null); // recaptcha failed!
						}

					} else {
						console.log(err);
						callback(err, null); // recaptcha failed!
					}
				});

			} else {
				console.log(err);
				callback(err, null); // one or more params failed!
			}
		});
	}

};