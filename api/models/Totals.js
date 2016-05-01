/**
* Totals.js
*
* @description :: Keep track of the total count of distribution successes per period per account.
* 
* WARNING: Compound-index on account and started_unix for assuring uniqueness.
* 		   
* 		   db.totals.createIndex( { account: 1, started_unix: 1 }, { unique: true } )
*/

module.exports = {

	autoCreatedAt: false,
	autoUpdatedAt: false,

	attributes: {

		// payee account
		account: {
			type: 'string',
			required: true,
			unique: false
		},
		// start of time range of the Distribution records considered
		started_unix: {
			type: 'integer',
			required: true,
			unique: false
		},
		// end of time range of the Distribution records considered
		ended_unix: {
			type: 'integer',
			required: true,
			unique: false
		},
		// the last time this record was modified
		modified_unix: {
			type: 'integer',
			required: true,
			unique: false
		},
		// the total count of distribution records for this payee where status = 'accepted'
		total_count: {
			type: 'integer',
			required: true,
			unique: false
		},
		// based on total_count and PayoutSchedule
		percentage_owed: {
			type: 'string',
			required: true,
			unique: false
		},
		krai_owed: {
			type: 'string',
			required: true,
			unique: false
		},
		raw_rai_owed: {
			type: 'string',
			required: true,
			unique: false
		},
		// time when they were paid
		paid_unix: {
			type: 'integer',
			required: true,
			unique: false
		},
		// block hash receipt after they were paid
		receipt_hash: {
			type: 'string',
			required: false, // although we always set it, even to "" to indicate a realtime row record.
			unique: false
		}
	},

 	/**
	 * Distribution Request
 	 * 
 	 * First, check to see if the session start timer is expired.
 	 * Second, validate all parameters passed (parameters, recaptcha, account)
 	 * Third, find the latest totals record for the requesting user.
 	 * Fourth, check to see if this record has been modified in the past 6-seconds.
 	 * Fifth, upsert the totals record with a new payload or an updated one.
 	 */
	request: function(parameters, callback) {

		// check if the initial session timer is expired (good) or not (bad)
		checkIfSessionReady = function() {

			Totals.checkExpired(parameters.sessionStarted, function(err, resp) {

				// session timer is expired. continue!
				if (!err) {
					validation(parameters);
				} else {
					callback({ message: 'try_again' }, null); // session timer not expired!
				}
			});
		};

		/**
		 * 1st, validate the parameter input
		 * 2nd, validate the ReCaptcha response
		 * 3rd, validate the account
		 *
		 * SUCCESS: Returns true
		 * ERROR: Returns a string containing the message we'll send to the front-end of the app
		 */
		validation = function(parameters) {

			ValidateParametersService.validate(parameters, function(err, resp) {
				
				if(!err) {

					ValidateRecaptchaService.validate(parameters.response, function(err, resp) {
						
						if(!err) {

							ValidateAccountService.validate(parameters.account, function(err, resp) {
								
								if(!err) {
									fetchLatestTotalsRecord();
								} else {
									callback('account_error' , null);
								}
							});
						} else {
							callback('recaptcha_error', null);
						}
					});
				} else {
					callback(err + '_error', null);			
				}
			});
		};

		// find this account's latest record for an account that's not finalized yet (realtime)
		fetchLatestTotalsRecord = function() {

	        Totals.native(function(err, collection) {
				if (!err){
					collection.find({ account: parameters.account, ended_unix: 0 }).limit(1).sort({ 'started_unix': -1 }).toArray(function (err, results) {
						if (!err) {
							checkTotalsResults(results);
						} else {
							callback({ message: 'server_error' }, null); // error with mongodb
						}
					});
				} else {
					callback({ message: 'server_error' }, null); // error with mongodb
				}
			});
		};

		// checks the results for the latest Totals record.
		// if it's empty, we create a new one.
		checkTotalsResults = function(results) {

			if(results.length === 0) {

				results.push({
				    paid_unix: 0,
				    receipt_hash: '',
				    account: parameters.account,
				    total_count: 0,
				    started_unix: TimestampService.unix(),
				    modified_unix: 0,
				    ended_unix: 0,
				    percentage_owed: 0,
				    krai_owed: 0,
				    raw_rai_owed: '0'
				});
			}

			checkIfRecordReady(results);
		};	

		// check if the totals record is ready to be updated again or not
		checkIfRecordReady = function(results) {

			Totals.checkExpired(results[0].modified_unix, function(err, resp) {

				// session timer is expired. continue!
				if (!err) {
					upsertTotalsRecord(results);
				} else {
					callback({ message: 'try_again' }, null); // session timer not expired!
				}
			});
		};

		upsertTotalsRecord = function(results) {

			// update their record with an increased count by 1.
			Totals.native(function(err, collection) {
				if (!err) {

					// increase count by 1.
					results[0].total_count++;

					collection.update({ account: results[0].account, started_unix: results[0].started_unix }, results[0], { upsert: true }, function (err, upserted) {
						if (!err) {
							callback(null, { message: 'success' });
						} else {
							callback({ message: 'server_error' }, null); // error with mongodb
						}
					});
				} else {
					callback({ message: 'server_error' }, null); // error with mongodb
				}
			});
		}

		// get this party started.
		checkIfSessionReady();
	},

	/**
	 * Updates Totals model (used by cron every minute) to hold near-REALTIME data
	 *
	 * First, find out the total Krai to pay out per hour.
	 * Second, calculate totals for all accounts for unpaid period.
	 * Third, count each account's 'accepted' records and build a payload to UPSERT that data (INSERT first time, UPDATE SUBSEQUENT).
	 * Fourth, iterate through all records and calculate percentages owed along with krai_owed, and raw_rai_owed.
	 * Fifth, begin tailcall recursion through all records to be able to utilize callbackC() properly
	 *
	 * IMPORTANT NOTES:
	 *
	 * Realtime records in the current 'unpaid distribution' are purposely marked with an string for the receipt_hash.
	 * The empty string prevents payouts from happening because payouts only occur on records where receipt_hash === 0.
	 * When the cron runs every 2 hours for payouts, it updates all of the past-period's records with receipt_hash = 0 from ""
	 * This then allows those accounts to get paid out on after the cron runs but not before.
	 */
	processTotals: function(callbackPT) {

		Totals.totalKrai(function(errPT, respPT) {
			
			/**
			 * Results found! (GOOD) CONTINUE request
			 * We have the total Krai being paid out
			 */
			if(!errPT) {

				var hourly_rai = respPT.hourly_rai;

				Totals.calculate(function(errPT, respPT) {

					/**
					 * Results found! (GOOD) CONTINUE request
					 * We have a list of accounts with counts for successfully solved captchas
					 */
					if(!errPT) {

						var hoursSinceLastRan = respPT.hoursSinceLastRan,
						payout_amount,
						recordsCount = 0,
						accountsCount = 0,
						recordsPT = [];

						if(hoursSinceLastRan === 0) {
							payout_amount = hourly_rai * 1; // if under 1 hour, then assume 1 hour for realtime projections accuracy.
						} else {
							payout_amount = hourly_rai * hoursSinceLastRan;
						}

						/**
						 * Iterate through each account and their success count
						 * We want to upsert a record into Totals collection
						 */
						
						for(key in respPT.results) {

							var payloadPT = {
								paid_unix: 0, // filled upon payout.
								receipt_hash: "", // filled upon payout. explicitly set to an empty string to indicate it's a realtime row and that payouts aren't possible yet.
								account: respPT.results[key]._id,
								total_count: respPT.results[key].count,
								started_unix: respPT.lastRan,
								ended_unix: 0 // this is 0 because there is no end time yet.
							};

							accountsCount++;
							recordsPT.push(payloadPT);
							recordsCount += payloadPT.total_count;
						}

						/**
						 * Iterate through all records, calculate percentage / krai owed & create record
						 * Totals must be compound-unique-indexed on ended_unix time to prevent dupes.
						 */
						for(keyPT in recordsPT) {

							recordsPT[keyPT].percentage_owed = recordsPT[keyPT].total_count / recordsCount;
							recordsPT[keyPT].krai_owed = Math.floor(recordsPT[keyPT].percentage_owed * payout_amount);
							recordsPT[keyPT].raw_rai_owed = recordsPT[keyPT].krai_owed + '' + Globals.rawKrai;
						}

						/**
						 * Iterate through all account records for the unpaid distribution &
						 * update their record with their updated stats
						 */
        				loopTotals = function(recordsPT) {

        					if(recordsPT.length > 0) {

        						var wherePT = {
									'$and': [
										{
											account: recordsPT[0].account
										},
										{
											started_unix: recordsPT[0].started_unix
											//started_unix: recordsPT[0].ended_unix
										}
									]
								};

								//console.log(TimestampService.utc() + ' Update Where PT');
								//console.log(TimestampService.utc() + ' ' + JSON.stringify(wherePT));

								//console.log(TimestampService.utc() + ' Update What PT');
								//console.log(TimestampService.utc() + ' ' + JSON.stringify(recordsPT[0]));
								Totals.native(function(errPT, collectionPT) {
									if (!errPT) {

										collectionPT.update(wherePT, recordsPT[0], { upsert: true }, function (errPT, updatedPT) {
											if (!errPT) {

												// remove the first record
												recordsPT.splice(0,1);

												// loop through totals
												loopTotals(recordsPT);

											} else {
												callbackPT(errPT, null);
											}
				                        });
			                        } else {
				                        callbackPT(errPT, null);
			                        }
		                        });
							}

							// resp length is 0 now... looping is complete.
							// now we need to update DT with the new record.

							else {

						        // find the row we are about to update to get it's created_unix time
						        DistributionTracker.find({ ended_unix: 0 }, function(errPT, resPT) {

						            if(!errPT) {

						            	var started_unix;

						            	//console.log('resPT');
						            	//console.log(JSON.stringify(resPT));

						            	// if there is a currenty open unpaid distribution, use it.
						            	if(respPT.lastRan === 0) {
						            		started_unix = respPT.lastHour;
						            	} else {
						            		started_unix = respPT.lastRan;
						            	}

						            	var payloadPT = {
								            started_unix: started_unix,
								            ended_unix: 0,
								            accounts: accountsCount,
								            successes: recordsCount,
								            finalized: false
								        };

								        // if there is a results, retain the created_unix time 
						            	if(resPT.length > 0) {
						            		payloadPT.created_unix = resPT[0].created_unix;
									    }

									    //console.log(TimestampService.utc() + ' Pre-DT Update Payload');
								        //console.log(TimestampService.utc() + ' ' + JSON.stringify(payloadPT));

									    // update distribution tracker
									    DistributionTracker.update(payloadPT, function(errPT, respPT) {
								            if(!errPT) {
								                callbackPT(null, true); // looping finalized and distribution tracker updated
								            } else {
								                callbackPT(errPT, null);
								            }
								        });
						        	} else {
						        		callbackPT(errPT, null);
						        	}
						        });
							}
						};

						//console.log(TimestampService.utc() + ' recordsPT');
						//console.log(TimestampService.utc() + ' ' + JSON.stringify(recordsPT));

						// kick off looping through totals.
						loopTotals(recordsPT);
					} 

					/**
					 * No results found! (BAD) HALT request
					 * For some reason, calculations failed. Don't process saving records.
					 */		
					else {
						callbackPT(errPT, null);
					}
				});
			}

			/**
			 * No results found! (BAD) HALT request
			 * For some reason, we could not receive an amount. An RPC could have failed or mongoDB.
			 */
			else {
				callbackPT(errPT, null);
			}
		});
	},

	/*
 	 * Determine if a record is expired
 	 * Accepts a unix timestamp for comparison against now.
 	 */
 	checkExpired: function(unixtime, callback) {

		var elapsedTime = TimestampService.unix() - unixtime;

		// (!err) record is expired, returns success
		if (elapsedTime >= Globals.distributionTimeout) {
			callback(null, true);
		} 
		// (err) record isn't expired, returns error
		else {
			var timeLeft = Globals.distributionTimeout - elapsedTime;
			callback(timeLeft, null);
		}
 	},
};