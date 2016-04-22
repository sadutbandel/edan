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
			required: true,
			unique: false
		}
	},

	/**
	 * Calculate metrics by account for current unpaid distribution period
	 * Grabs all 'accepted' records greater than or equal to the last time Distribution calculations were last finalized
	 *
	 * returns: 
	 * { hoursSinceLastRan: 0,
     * lastHour: 1461294000,
  	 * lastRan: 1461294000 }
	 *
	 **/
	calculate: function(callback) {

		DistributionTracker.last({ finalized: true, paid: true }, function(err, resp) {
	        
	      	if(!err) {

				// match only 'accepted' records that are in the current, unpaid distribution timeframe (realtime data)
				var match = {

					'$and': [
						{
							modified : { 
			 					'$gte': resp.lastRan
			 				}
			 			},
			 			{ 
			 				status: 'accepted'
			 			},
		 			]
				};

				// count 'success' records and group by account.
				var group = {
					_id: '$account',
					count: { 
						'$sum': 1
					}
				};

				Distribution.native(function(err, collection) {
					if (!err){

						collection.aggregate([{ '$match' : match }, { '$group' : group }]).toArray(function (err, results) {
							if (!err) {

								/**
								 * No matches found. (bad) HALT request!
								 * 
								 * If NO matches are found, then there are no Distribution records yet.
								 */
								
								if(Object.keys(results).length === 0) {
									callback('no matches 1', null);
								}
								/**
								 * Matches found. (good) CONTINUE request!
								 * 
								 * If matches ARE found, then we should get a list of accounts with counts.
								 */
								else {
									resp.results = results;
									callback(null, resp);
								}
							} else {
								callback({ error: err }, null);
							}
						});
					} else {
						callback({ error: err }, null);
					}
				});
			} else {
	         	callback({ error: err }, null);
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
	 * Fifth, begin tailcall recursion through all records to be able to utilize callback() properly
	 *
	 * IMPORTANT NOTES:
	 *
	 * Realtime records in the current 'unpaid distribution' are purposely marked with an string for the receipt_hash.
	 * The empty string prevents payouts from happening because payouts only occur on records where receipt_hash === 0.
	 * When the cron runs every 2 hours for payouts, it updates all of the past-period's records with receipt_hash = 0 from ""
	 * This then allows those accounts to get paid out on after the cron runs but not before.
	 */
	processTotals: function(callback) {

		Totals.totalKrai(function(err, resp) {

			/**
			 * Results found! (GOOD) CONTINUE request
			 * We have the total Krai being paid out
			 */
			if(!err) {

				var hourly_rai = resp.hourly_rai;

				Totals.calculate(function(err, resp) {

					/**
					 * Results found! (GOOD) CONTINUE request
					 * We have a list of accounts with counts for successfully solved captchas
					 */
					if(!err) {

						var hoursSinceLastRan = resp.hoursSinceLastRan,
						payout_amount,
						recordsCount = 0,
						accountsCount = 0,
						records = [];

						if(hoursSinceLastRan === 0) {
							payout_amount = hourly_rai * 1; // if under 1 hour, then assume 1 hour for realtime projections accuracy.
						} else {
							payout_amount = hourly_rai * hoursSinceLastRan;
						}

						/**
						 * Iterate through each account and their success count
						 * We want to upsert a record into Totals collection
						 */
						
						for(key in resp.results) {

							var payload = {
								paid_unix: 0, // filled upon payout.
								receipt_hash: "", // filled upon payout. explicitly set to an empty string to indicate it's a realtime row and that payouts aren't possible yet.
								account: resp.results[key]._id,
								total_count: resp.results[key].count,
								started_unix: resp.lastRan,
								ended_unix: 0 // this is 0 because there is no end time yet.
							};

							accountsCount++;
							records.push(payload);
							recordsCount += payload.total_count;
						}

						/**
						 * Iterate through all records, calculate percentage / krai owed & create record
						 * Totals must be compound-unique-indexed on ended_unix time to prevent dupes.
						 */
						for(key in records) {

							records[key].percentage_owed = records[key].total_count / recordsCount;
							records[key].krai_owed = Math.floor(records[key].percentage_owed * payout_amount);
							records[key].raw_rai_owed = records[key].krai_owed + '' + Globals.rawKrai;
						}

						/**
						 * Iterate through all records again to update the realtime records for the unpaid distribution
						 */
						
						// iterate over our response of accounts needing payment
        				loopTotals = function(records) {

        					if(records.length > 0) {

        						var where = {
									'$and': [
										{
											account: records[0].account
										},
										{
											ended_unix: records[0].ended_unix
										}
									]
								};

								Totals.native(function(err, collection) {
									if (!err) {

										collection.update(where, records[0], { upsert: true }, function (err, updated) {
											if (!err) {

												// remove the first record
												records.splice(0,1);

												// loop through totals
												loopTotals(records);

											} else {
												console.log(err);
											}
				                        });
			                        } else {
			                        	console.log('Realtime Totals Failed Mongo');
				                        callback(err, null); // completed!
			                        }
		                        });
							} else {

								/**
								 * Once looping over totals calculations is finalized, 
								 * create/update DistributionTracker with the new numbers.
								 */
								var payload = {
						            started_unix: resp.lastRan,
						            ended_unix: 0,
						            accounts: accountsCount,
						            successes: recordsCount,
						            finalized: false,
						            paid: false
						        };

								DistributionTracker.update(payload, function(err, resp) {
						            if(!err) {
						                callback(null, true); // looping finalized and distribution tracker updated
						            } else {
						                callback(err, null);
						            }
						        });
							}
						};

						// kick off looping through totals.
						loopTotals(records);
					} 

					/**
					 * No results found! (BAD) HALT request
					 * For some reason, calculations failed. Don't process saving records.
					 */		
					else {
						callback(err, null);
					}
				});
			}

			/**
			 * No results found! (BAD) HALT request
			 * For some reason, we could not receive an amount. An RPC could have failed or mongoDB.
			 */
			else {
				callback(err, null);
			}
		});
	},

	/**
	 * Find the total amount of Krai currently being paid out hourly
	 * Using KraiFromRawService, return the amount in Krai from raw.
	 */
	totalKrai: function(callback) {

		PayoutSchedule.native(function(err, collection) {
			if (!err){

				collection.find().limit(1).sort({'$natural': -1}).toArray(function (err, results) {
					if (!err) {

						KraiFromRawService.convert(results[0].hourly_rai, function(err, resp) {

							if(!err) {
								callback(null, { hourly_rai: resp.response.amount });
							} else {
								callback(err, null);
							}
						});
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