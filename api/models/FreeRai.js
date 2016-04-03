/**
* FreeRai.js
*
* @description :: Requires an account string, and a recaptcha response string (derived from a user-click / puzzle solve). 
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

	attributes: {

		account: {
			type:'string',
			required:true,
			unique: false
		},

		unixtime: {
			type:'integer',
			required:true,
			unique: false
		},

		response: {
			type:'string',
			required:false,
			unique: false
		},

		sessionID: {
			type:'string',
			required:true,
			unique:false
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

		// check requesters for a match
		Requester.check(parameters, function(err, resp) {
				
			// no match, proceed onward
			if(!err) {
				console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (!err) Requester.check()... ');

				var requesterPayload = JSON.parse(JSON.stringify(parameters));

				// create our requester record
				Requester.createRecord(requesterPayload, function(err, resp) {

		 			if(!err) {
						console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (!err) Requester.create()... ');
						
						// ensure all parameters are fulfilled
						FreeRaiService.verifyParameters(parameters, function(err, resp) {

							// parameters passed!
							if(!err) {
								console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (!err) verifying form parameters... ');

								// ensure the recaptcha response is valid by asking Google
								RecaptchaService.verifyResponse(parameters.response, function(err, resp) {

									if(!err) {
										console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (!err) verifying recaptcha... ');

										// check if the account is valid
										ValidateAccountService.validate(parameters.account, function(err, resp) {

											if(!err) {
												console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (!err) verifying account... ');

												// Are you being a dick?
												WowDick.check(parameters, function(wowDickErr, wowDickResp) {

													// being a dick
													if(wowDickErr) {
														console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (err) WowDick.check()... ' + JSON.stringify(wowDickErr));

														// if we're supposed to findExpired()...
														if(wowDickErr.findExpired) {

															WowDick.checkExpired(wowDickErr.resp[0].unixtime, function(err, resp) {
																
																// record is expired
																if(!err) {
																	console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (err) findExpired()... ' + JSON.stringify(resp));

																	WowDick.removeRecordByAccount(parameters, function(err2, resp2) {

																		if(!err2) {
																			console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (!err) removeRecordByAccount()... ' + JSON.stringify(resp2));

																			WowDick.removeRecordByIP(parameters, function(err3, resp3) {

																				if(!err3) {
																					console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (!err) removeRecordByIP()... ' + JSON.stringify(resp3));
																					
																					// send rai to account
																					FreeRai.sendRaiAndKeepRecords(parameters, function(err, resp) {
																						if(!err) {
																							callback(null, resp); // free rai were not sent
																						} else {
																							callback(err, null); // free rai were not sent
																						}
																					});
																				} else {
																					console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (err) removeRecordByIP()... ' + JSON.stringify(err3));
																					// remove requester record.
																					Requester.removeRecordByAccount(parameters, function(err2, resp2) {
																						console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] removing requester record... ');
																						callback(err3, null);
																					});
																				}
																			});
																		} else {
																			console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (err) removeRecordByAccount()... ' + JSON.stringify(err2));
																			// remove requester record.
																			Requester.removeRecordByAccount(parameters, function(err2, resp2) {
																				console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] removing requester record... ');
																				callback(err2, null);
																			});
																		}
																	});
																} else { // record not expired yet...
																	
																	var obj = {
																		message: 'premature',
																		wait: err // duration from WowDick.checkExpired()
																	};
																	console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (err) findExpired()... ' + JSON.stringify(obj));

																	// remove requester record.
																	Requester.removeRecordByAccount(parameters, function(err2, resp2) {
																		console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] removing requester record... ');
																		callback(obj, null); // free rai were not sent
																	});
																	
																}
															});
														} else { // record in wowdick
															// remove requester record.
															Requester.removeRecordByAccount(parameters, function(err2, resp2) {
																console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] removing requester record... ');
																callback(wowDickResp, null); // not expired yet
															});
														}
													} else { // not a dick

														console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (!err) WowDick.check()... ');

														// send rai to account
														FreeRai.sendRaiAndKeepRecords(parameters, function(err, resp) {
															if(!err) {
																callback(null, resp); // free rai were not sent
															} else {
																callback(err, null); // free rai were not sent
															}
														});
													}
												});
											} else {
												console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (err) verifying account... ' + JSON.stringify(err));
												// remove requester record.
												Requester.removeRecordByAccount(parameters, function(err2, resp2) {
													console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] removing requester record... ');
													callback(err, null); // account validation failed
												});
											}
										});
									} else {
										console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (err) verifying recaptcha... ' + JSON.stringify(err));
										// remove requester record.
										Requester.removeRecordByAccount(parameters, function(err2, resp2) {
											console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] removing requester record... ');
											callback(err, null); // recaptcha failed!
										});
									}
								});
							} else {
								console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (err) verifying form parameters... ' + JSON.stringify(err));
								// remove requester record.
								Requester.removeRecordByAccount(parameters, function(err2, resp2) {
									console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] removing requester record... ');
									callback(err, null); // one or more params failed!
								});
							}
						});
					} else {
						console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (err) Requester.create()... ' + JSON.stringify(err));
		 				callback(err, null); // requester creation failed!
		 			}
				});
			} else { // requester match, don't proceed
				console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (err) Requester.check()... ' + JSON.stringify(err));
				callback(err, null); // one or more params failed!
			}
		});
	},

	// create a new free-rai success record
	createRecord: function(payload, callback) {

 		FreeRai.create(payload).exec(function (err, results) {
 			if(!err) {
 				callback(null, results);
 			} else {
 				callback(err, null);
 			}
		});
 	},

 	// keep track of a few things
 	keepRecords: function(payload, callback) {

 		// callback() for WowDick only. FreeRai can fail silently
		FreeRai.createRecord(payload.parameters, function(err, resp) {
			if(!err) {
				console.log(TimestampService.utc() + ' ' + payload.parameters['ip'] + ' ' + payload.parameters['sessionID'] + ' [FreeRai.js] (!err) creating freerai record... ');
			} else {
				console.log(TimestampService.utc() + ' ' + payload.parameters['ip'] + ' ' + payload.parameters['sessionID'] + ' [FreeRai.js] (err) creating freerai record... ' + JSON.stringify(err));
			}
		});

		WowDick.createRecord(payload.parameters, function(err1, resp1) {

			if(!err1) {
				console.log(TimestampService.utc() + ' ' + payload.parameters['ip'] + ' ' + payload.parameters['sessionID'] + ' [FreeRai.js] (!err) creating wowdick record... ' + JSON.stringify(resp1));
				
				// remove our requester record, only after we gaurantee they were entered into wowDick.
				// if they aren't entered into wowdick, we don't want to remove their requester record.
				
				Requester.removeRecordByAccount(payload.parameters, function(err2, resp2) {
		 			if(!err2) {
		 				console.log(TimestampService.utc() + ' ' + payload.parameters['ip'] + ' ' + payload.parameters['sessionID'] + ' [FreeRai.js] (!err) removing requester record... ' + JSON.stringify(resp2));
						callback(null, payload.freeRaiResp); // resp from sending rai in prior callback
					} else {
						console.log(TimestampService.utc() + ' ' + payload.parameters['ip'] + ' ' + payload.parameters['sessionID'] + ' [FreeRai.js] (err) removing requester record... ' + JSON.stringify(err2));
						callback(err2, null);
					}
				});
			} else {
				console.log(TimestampService.utc() + ' ' + payload.parameters['ip'] + ' ' + payload.parameters['sessionID'] + ' [FreeRai.js] (err) creating wowdick record... ' + JSON.stringify(err1));
			}
		});
 	},

 	sendRaiAndKeepRecords: function(parameters, callback) {

 		// send rai to account
		FreeRaiService.send(parameters, function(err, resp) {
			if(!err) {
					
				// as long as the block is not empty (faucet off?)
				if(resp.response.block !== '0000000000000000000000000000000000000000000000000000000000000000') {

					console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (!err) sending free rai... ' + JSON.stringify(resp));

					// don't bring recaptcha responses along
					delete parameters.response;
	 			
					// keepRecord payload
					var krPayload = {
						parameters: parameters,
						freeRaiResp: resp
					};

					// record keeping (self-descriptor)
					FreeRai.keepRecords(krPayload, function(err, resp) {
						if(!err) {
							callback(null, resp);
						} else {
							callback(err, null);
						}
					});
				} else {

					console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (err) faucet off, free rai not sent...');
					
					Requester.removeRecordByAccount(parameters, function(err2, resp2) {
			 			if(!err2) {
			 				console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (!err) removing requester record... ' + JSON.stringify(resp2));
							callback({ message: 'faucetoff' }, null); // faucet must be off
						} else {
							console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (err) removing requester record... ' + JSON.stringify(err2));
							callback({ message: 'faucetoff' }, null); // faucet must be off
						}
					});
				}
			} else {
				console.log(TimestampService.utc() + ' ' + parameters['ip'] + ' ' + parameters['sessionID'] + ' [FreeRai.js] (err) sending free rai... ' + JSON.stringify(err));
				callback(err, null); // free rai were not sent
			}
		});
 	}
};