/**
 * Distribution.js
 *
 * Responsible for the start of a distribution request after it's initiated from DistributionController.js
 */

module.exports = {

	autoCreatedAt: false,
	autoUpdatedAt: false,

	attributes: {

		account: {
			type:'string',
			required:false,
			unique: false
		},
		
		// unix timestamp
		modified: {
			type:'integer',
			required:true,
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
		},

		status: {
			type:'string',
			required:true,
			unique:false
		}
	},

	/**
	 * Distribution Request
 	 * 
 	 * First, check to see if their initial timer is expired. If not, we know they waited and can continue.
 	 * Second, create a new Distribution record marked as 'pending'.
 	 * Third, send the Distribution record payload to DistributionService.process() for the bulk of the processing like validation and violation checks.
 	 * Fourth, after all V&V checks succeed, return the updated historical data for this user to the front-end of the app.
 	 * Alternate-Fourth, if the V&V checks fail, then mark their record as a 'violation'
	 */
	request: function(parameters, callback) {

		// Checks the initial-session timer to see if it's expired
		Distribution.checkExpired(parameters.sessionStarted, function(err, resp) {

			/**
			 * Session timer expired. (good) CONTINUE request!
			 */
			if (!err) {

				/**
				 * Distribution Request Creation
				 *
				 * Create a new entry where status = 'pending'
				 */
				var payload = {
					modified: parameters.modified,
					account: parameters.account,
					ip: parameters.ip,
					sessionID: parameters.sessionID,
					status: 'pending'
				};

				Distribution.create(payload).exec(function (err, results) {
		 			if(!err) {

		 				// the id created by mongodb is used in DistributionService.process()
		 				parameters.createdID = results.id;

		 				/**
		 				 * Validation & Violation Layer
		 				 *
		 				 * Returns true for success
		 				 * Returns an object with error message for failure
		 				 */
		 				DistributionService.process(parameters, function(error, resp) {

		 					if(!error) {

		 						/**
		 						 * Pull MY totals records for all-time, including my realtime data for the current unpaid period
		 						 * @type {Object}
		 						 */
								var what = {
									started_unix: 1,
									ended_unix: 1,
									total_count: 1,
									percentage_owed: 1,
									krai_owed: 1,
									paid_unix: 1,
									receipt_hash: 1,
									_id: 0
								};

								var where = {
									account: parameters.account
								};

								// my records
								// if I have no records, this won't show.
								Totals.native(function(err, collection) {
									if (!err){

										collection.find(where, what).sort({ 'ended_unix': -1 }).toArray(function (err, results) {
											if (!err) {

												// everyone's data for all periods
												DistributionTracker.native(function(err, collection) {
													if (!err){

														// grab all records, and don't bring in the id of the record.
														var where = {};
														var what = {
															_id: 0
														};

														collection.find(where, what).sort({ 'started_unix': -1 }).toArray(function (err, res) {
															if (!err) {

																// we always have results, unless payments just occurred
																// and/or if we don't have any counts this minute yet.
																if(res.length > 0) {

																	// turn each object's key into 'started_unix' timestamp
																	// this will let us match the matching objects in both
																	// My Distributions (results)
																	// and Past Distributions (res)
																	var resultsNew = {};
																	var resNew = {};

																	for(key in results) {
																		var newKey = results[key].started_unix;
																		resultsNew[newKey] = results[key];
																	}
																	for(key in res) {
																		var newKey = res[key].started_unix;
																		resNew[newKey] = res[key];
																	}

																	var newResults = [];

																	// Merge total successes and accounts into "My Distributions"
																	for(key in resultsNew) {
																		if(resNew[key]) {
																			resultsNew[key].successes = resNew[key].successes;
																		}
																		if(resNew[key]) {
																			resultsNew[key].accounts = resNew[key].accounts;
																		}
																		newResults.push(resultsNew[key]);// re-store our merged datas
																	}

																	// convert unix timestamps to milliseconds for angular digestion
																	for(key in newResults) {
																		results[key].paid_unix = results[key].paid_unix * 1000;
																		results[key].started_unix = results[key].started_unix * 1000;
																		results[key].ended_unix = results[key].ended_unix * 1000;
																	}

																	// create a clone of the results
																	var resultsClone = JSON.parse(JSON.stringify(newResults));

																	// grab the last element in the array
																	// this will either be the oldest totals record (bad)
																	// or the most recent, unpaid distribution record (good)
																	var lastElement = resultsClone.slice(-1)[0];

																	if(lastElement) {
																		
																		// if the ended_unix time === 0, then this is a current unpaid distribution record
																		// so store this as the current_distribution
																		// then create a complete_count property as well
																		if(lastElement.ended_unix === 0) {

							 												// store our current distribution by grabbing the last item in the array
							 												resp.current_distribution = lastElement;
							 												resp.current_distribution.complete_count = res[0].successes;

						                                					// remove the last object element (realtime unpaid distribution) from 
						                                					// the array, then store past distributions.
						                                					results.pop();
						                                				}
						                                			}
					                                				// we should always have past distributions
					                                				resp.past_distributions = results;

					                                				// this is all past distributions. we could enable anytime for use.
					                                				//resp.distribution_tracker = res; // all DistributionTracker records

						 											callback(null, resp);
						 										} 

						 										// if the server was just-lifted, or if they don't have any records yet
						 										// then they will get a little message indicating that instead of nothing.
						 										else {
						 											callback(null, { message: 'success', no_records: true });
						 										}
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
	 								} else {
	 									callback(null, { message: 'success' });
	 								}
	 							});
		 					} else {	
		 						
		 						/**
				 				 * Validation fail OR Violation occurred...
				 				 *
				 				 * Update the 'pending' Distribution record as 'violation'
				 				 * Returns true for success
				 				 * Returns an object for failures with information as to why
				 				 */
		 						var payload = {
		 							modified : TimestampService.unix(),
									account: parameters.account,
									ip: parameters.ip,
									sessionID: parameters.sessionID,
									status: 'violation'
								};

								Distribution.update({ id:results.id }, payload).exec(function (err, updated){
									if (!err) {
										// disregard the record object response 
										callback(null, error); // use err from .process()
									} else {
										callback({ error: err }, null); // error Distribution.update()
									}
								});	
		 					}
		 				});
		 			} else {
		 				callback({ error: err }, null); // error Distribution.create()
		 			}
				});
			} 

			/**
			 * Session timer NOT expired. (bad) HALT request!
			 * 
			 * If the initial session timer has NOT expired, we know the web-visitor 
			 * is brand new, opened a private-browsing (incognito) window, or cleared cache.
			 */	
			else {
				res.send({ message: 'wait', wait: err });
			}
		});
	},

 	/**
 	 * Determine if record is expired (6s)
 	 * @param  unixtime  integer
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
 	}
};