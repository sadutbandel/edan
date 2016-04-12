/**
* Totals.js
*
* WARNING: This must contain a compound index to prevent duplicate records.
* 		   Anytime the collection is destroyed, the index must be recreated
* 		   using:
* 		   
* 		   db.totals.createIndex( { account: 1, ended_unix: 1 }, { unique: true } )
* 		   
* @description :: Count the total distribution records per account
* 
*/

module.exports = {

	attributes: {

		// payee account
		account: {
			type:'string',
			required:true,
			unique: false
		},
		// start of time range of the Distribution records considered
		started_unix: {
			type:'integer',
			required:true,
			unique: false
		},
		// end of time range of the Distribution records considered
		ended_unix: {
			type:'integer',
			required:true,
			unique: false
		},
		// the total count of distribution records for this payee where status = 'accepted'
		total_count: {
			type:'integer',
			required:true,
			unique: false
		},
		// based on total_count and PayoutSchedule
		percentage_owed: {
			type:'string',
			required:true,
			unique: false
		},
		mrai_owed: {
			type:'string',
			required:true,
			unique: false
		},
		mrai_owed_raw: {
			type:'string',
			required:true,
			unique: false
		},
		// time when they were paid
		paid_unix: {
			type:'integer',
			required:true,
			unique: false
		},
		// block hash receipt after they were paid
		receipt_hash: {
			type:'string',
			required:true,
			unique: false
		}
	},

	/**
	 * Count total success records per account
	 */
	calculate: function(account, callback) {

		// First, find the last time we ran the calculation script
		DistributionTracker.last(function(err, resp) {
	        
	        // this is used to store per individual account in Totals collection
	      	if(!err) {

				// Find records where status is 'accepted' and the modified time is greater than 
				// or equal to the end time of when the last time totals were calculated but also
				// less than the end of the most recent hour, which the function is using as the end.
				// Also, group by 'account' with a total count.
				var match = {

					'$and': [
						{
							modified : { 
			 					'$lt': resp.lastHour
			 				}
			 			},
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

				// if account is -1, we are filtering for all accounts and not a single one.
				// if it's NOT -1, then add more AND requirements for our mongo query. this let's us
				// recycle the totals.calculate function being used for all users, for just 1 user.
				if(account !== -1) {
					/* 
						Delete the 1st element in the array, so we can replace it LESS THAN OR EQUAL TO below.
						This will remain LESS THAN for calculations for Totals though because obviously if the clock rolls over to the next 
						hour, we shouldn't count any 0-second records as apart of the prior hour... This is only for including in the count 
						we show users immediately after they submit the Distribution form and it is successful.
					*/
					delete match['$and'][0].modified['$lt']; // deletes the 'modified' property inside the first object / array element.
					match['$and'].push({ account: account }); // add the single account to search for
					match['$and'][0].modified['$lte'] = TimestampService.unix(); // overwrite less-than last hour with less than now for a realtime count	
				}

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
									callback(true, null);
								}
								/**
								 * Matches found. (good) CONTINUE request!
								 * 
								 * If matches ARE found, then we should get a list of accounts with counts.
								 */
								else {
									// add 'results' property to our return response object
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
	 * Calculate totals successes by account since the last time we ran this
	 *
	 * #1 - Find the total amount of Mrai currently being paid out
	 * #2 - Calculate total success records by account & find percentages / mrai owed
	 * #3 - Store record in DistributionTracker of the time range we ran this for future reference
	 */
	processTotals: function(callback) {

		Totals.totalMrai(function(err, resp) {

			/**
			 * Results found! (GOOD) CONTINUE request
			 * We have the total Mrai being paid out
			 */
			if(!err) {

				var hourly_mrai = resp.hourly_mrai;

				Totals.calculate(-1, function(err, resp) {

					/**
					 * Results found! (GOOD) CONTINUE request
					 * We have a list of accounts with counts for successfully solved captchas
					 */
					if(!err) {

						var hoursSinceLastRan = resp.hoursSinceLastRan,
						hourly_payout_amount = hourly_mrai * hoursSinceLastRan,
						recordsCount = 0,
						accountsCount = 0,
						records = [];

						/**
						 * Iterate through each account and their success count
						 * We want to store their payload into Totals collection
						 * example: { _id: 'xrb_3efamcqebsbtxxk6hz48buqjq9b1d9kpy6k8c5j5ibm9adxx9wyj4bphwn87', count: 6 }
						 */
						for(key in resp.results) {

							var payload = {
								paid_unix: 0, // filled upon payout
								receipt_hash: 0, // filled upon payout
								account: resp.results[key]._id,
								total_count: resp.results[key].count,
								started_unix: resp.lastRan,
								ended_unix: resp.lastHour
							};

							accountsCount++;
							records.push(payload);
							recordsCount += payload.total_count;
						}

						/**
						 * Iterate through all records, calculate percentage / mrai owed & create record
						 * Totals is compound-unique-indexed on ended_unix time
						 */
						for(key in records) {

							records[key].percentage_owed = records[key].total_count / recordsCount;
							records[key].mrai_owed = Math.floor(records[key].percentage_owed * hourly_payout_amount);
							records[key].mrai_owed_raw = records[key].mrai_owed + '' + Globals.rawMrai;

							Totals.create(records[key], function(err, resp) {

								// processed
								if(!err) {
									console.log(JSON.stringify(resp));
								} else { // not processed
									console.log(JSON.stringify(err));
								}
							});
						}

						/**
						 * Create a new DistributionTracker record for the calculations in the given time-frame
						 */
						var payload = {
							created_unix: TimestampService.unix(),
							started_unix: resp.lastRan,
							ended_unix: resp.lastHour,
							accounts: accountsCount,
							successes: recordsCount
						}
						
						DistributionTracker.create(payload, function(err, resp) {
							// processed
							if(!err) {
								callback(null, resp);
							} else {
								callback(err, null);
							}
						});
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
	 * Find the total amount of Mrai currently being paid out
	 */
	totalMrai: function(callback) {

		PayoutSchedule.native(function(err, collection) {
			if (!err){

				collection.find().limit(1).sort({'$natural': -1}).toArray(function (err, results) {
					if (!err) {

						MraiFromRawService.convert(results[0].hourly_mrai, function(err, resp) {

							if(!err) {
								callback(null, { hourly_mrai: resp.response.amount });
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