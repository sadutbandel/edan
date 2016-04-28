/**
* Totals.js
*
* @description :: Count the total distribution records per account
* 
* WARNING: This must contain a compound index to prevent duplicate records.
* 		   Anytime the collection is destroyed, the index must be recreated
* 		   using:
* 		   
* 		   db.totals.createIndex( { account: 1, ended_unix: 1 }, { unique: true } )
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
	 * Calculate metrics by account for current unpaid distribution period
	 * Grabs all 'accepted' records greater than or equal to the last time Distribution calculations were last finalized
	 * 	if that time
	 *
	 * returns: 
	 * { hoursSinceLastRan: 0,
     * lastHour: 1461294000,
  	 * lastRan: 1461294000 }
	 *
	 **/
	calculate: function(callbackC) {

		console.log('Calculating');
		
		// last distributionTracker record
		DistributionTracker.last(function(errC, respC) {
	        
	      	if(!errC) {

	      		//console.log('respC');
	      		//console.log(respC);

				// match only 'accepted' records that are in the current, unpaid distribution timeframe (realtime data)
				var matchC = {

					'$and': [
						{
							modified : { 
			 					'$gte': respC.lastRan
			 				}
			 			},
			 			{ 
			 				status: 'accepted'
			 			},
		 			]
				};

				//console.log('matchC');
				//console.log(JSON.stringify(matchC));

				// count 'success' records and group by account.
				var groupC = {
					_id: '$account',
					count: { 
						'$sum': 1
					}
				};

				Distribution.native(function(errC, collectionC) {
					if (!errC) {

						collectionC.aggregate([{ '$match' : matchC }, { '$group' : groupC }]).toArray(function (errC, resultsC) {
							if (!errC) {

								/**
								 * No matches found. (bad) HALT request!
								 * 
								 * If NO matches are found, then there are no Distribution records yet.
								 */
								
								if(Object.keys(resultsC).length === 0) {
									callbackC('no matches 1', null);
								}
								/**
								 * Matches found. (good) CONTINUE request!
								 * 
								 * If matches ARE found, then we should get a list of accounts with counts.
								 */
								else {
									respC.results = resultsC;
									callbackC(null, respC);
								}
							} else {
								callbackC({ error: errC }, null);
							}
						});
					} else {
						callbackC({ error: errC }, null);
					}
				});
			} else {
	         	callbackC({ error: errC }, null);
	      	}
	   	});
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

	/**
	 * Find the total amount of Krai currently being paid out hourly
	 * Using KraiFromRawService, return the amount in Krai from raw.
	 */
	totalKrai: function(callbackTK) {

		PayoutSchedule.native(function(errTK, collectionTK) {
			if (!errTK){

				collectionTK.find().limit(1).sort({'$natural': -1}).toArray(function (errTK, resultsTK) {
					if (!errTK) {

						KraiFromRawService.convert(resultsTK[0].hourly_rai, function(errTK, respTK) {

							if(!errTK) {
								callbackTK(null, { hourly_rai: respTK.response.amount });
							} else {
								callbackTK(errTK, null);
							}
						});
					} else {
						callbackTK(errTK, null);
					}
				});
			} else {
				callbackTK(errTK, null);
			}
   		});
	}
};