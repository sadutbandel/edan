/**
* FreeRai.js
*
* @description :: Requires an account string, and a recaptcha response string (derives from user-click). 
* 
* processRequest handles everything.
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
		},

		sessionID: {
			type:'string',
			required:true,
			unique:true
		},

		ip: {
			type:'string',
			required:true,
			unique:false
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
		FreeRaiService.verifyParameters(parameters, function(err, resp) {
			console.log(TimestampService.utc() + ' verifying form parameters...');

			// parameters passed!
			if(!err) {

				console.log(TimestampService.utc() + ' --- ');
				console.log(resp);

				// ensure the recaptcha response is valid by asking Google
				RecaptchaService.verifyResponse(parameters.response, function(err, resp) {
					console.log(TimestampService.utc() + ' verifying recaptcha...');

					if(!err) {

						// recaptcha passed!
						if(resp.success) {

							console.log(TimestampService.utc() + ' --- ');
							console.log(resp);

							// check if the account is valid
							ValidateAccountService.validate(parameters.account, function(err, resp) {
								console.log(TimestampService.utc() + ' verifying account...');

								if(!err) {

									console.log(TimestampService.utc() + ' --- ');
									console.log(resp);

									// Are you being a dick?
									WowDick.check(parameters, function(err, resp) {
										console.log(TimestampService.utc() + ' wowdick check...');

										// Not a dick!
										if(!err) {

											console.log(TimestampService.utc() + ' --- ');
											console.log(resp);

											// send rai to account
											FreeRaiService.send(parameters, function(err, resp) {
												console.log(TimestampService.utc() + ' sending free rai...');

												if(!err) {

													console.log(TimestampService.utc() + ' --- ');
													console.log(resp);
													callback(null, resp);

												} else {

													console.log(TimestampService.utc() + ' --- ');
													console.log(err);
													callback(err, null); // free rai were not sent
												}
											});
										} else {
											console.log(TimestampService.utc() + ' --- ');
											console.log(err);
											callback(err, null); // you're a dick.
										}
									});

								} else {
									console.log(TimestampService.utc() + ' --- ');
									console.log(err);
									callback(err, null); // account validation failed!
								}
							});

						} else {
							console.log(TimestampService.utc() + ' --- ');
							console.log(resp);
							callback(resp, null); // recaptcha failed!
						}

					} else {
						console.log(TimestampService.utc() + ' --- ');
						console.log(err);
						callback(err, null); // recaptcha failed!
					}
				});

			} else {
				console.log(TimestampService.utc() + ' --- ');
				console.log(err);
				callback(err, null); // one or more params failed!
			}
		});
	}

};