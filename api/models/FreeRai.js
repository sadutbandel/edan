/**
* FreeRai.js
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
		FreeRaiService.verifyParameters(parameters, function(err, response) {
			console.log(Timestamp.utc() + ' verifying form parameters...');

			// parameters passed!
			if(!err) {

				console.log(Timestamp.utc() + ' ' + response);

				// ensure the recaptcha response is valid by asking Google
				RecaptchaService.verifyResponse(parameters.response, function(err, response) {
					console.log(Timestamp.utc() + ' verifying recaptcha...');

					if(!err) {

						// recaptcha passed!
						if(response.success) {

							console.log(Timestamp.utc() + ' ' + response);

							// check if the account is valid
							ValidateAccountService.validate(parameters.account, function(err, response) {
								console.log(Timestamp.utc() + ' verifying account...');

								if(!err) {

									console.log(Timestamp.utc() + ' ' + response);

									// send rai to account
									FreeRaiService.send(parameters, function(err, response) {
										console.log(Timestamp.utc() + ' sending free rai...');

										if(!err) {

											console.log(Timestamp.utc() + ' ' + response);
											callback(null, response);

										} else {

											console.log(Timestamp.utc() + ' ' + err);
											callback(null, err); // free rai were not sent
										}
									});

								} else {
									console.log(Timestamp.utc() + ' ' + err);
									callback(err, null); // account validation failed!
								}
							});

						} else {
							console.log(Timestamp.utc() + ' ' + response);
							callback(response, null); // recaptcha failed!
						}

					} else {
						console.log(Timestamp.utc() + ' ' + err);
						callback(err, null); // recaptcha failed!
					}
				});

			} else {
				console.log(Timestamp.utc() + ' ' + err);
				callback(err, null); // one or more params failed!
			}
		});
	}

};