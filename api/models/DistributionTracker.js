/**
* DistributionTracker.js
*
* @description :: Keeps track of distribution calculations for a given time range
* 
*/

module.exports = {

	autoCreatedAt: false,
	autoUpdatedAt: false,

	attributes: {
		
		created_unix: {
			type:'integer',
			required:true,
			unique: false
		},
		// started unixtime the counter used
		started_unix: {
			type:'integer',
			required:true,
			unique: false
		},
		// end unixtime the counter used
		ended_unix: {
			type:'integer',
			required:true,
			unique: true
		},
		// the total number of xrb_accounts (distinct) for this counted period of time
		accounts: {
			type:'integer',
			required:true,
			unique: false
		},
		// the total number of successful distribution records
		successes: {
			type:'integer',
			required:true,
			unique: false
		},
		// whether or not final calculations have been done yet
		finalized: {
			type:'boolean',
			required:true,
			unique: false
		}
	},

	/**
	 * Fetch the most recent DistributionTracker record that matches params.
	 *
	 * params = {
	 * 	limit: <positive integer>,
	 * 	finalized: true/false
	 * }
	 *
	 * Returns { lastHour, lastRan, hoursSinceLastRan }
	 */
	fetch: function(paramsF, callbackF) {

		var recordsF = [];

		// Loop through every DistributionTracker record in the result.
		// Create a payload which returns Last hour, Last ran, Hours since last ran, the created_unix and started_unix times
		loopDtResults = function(resultsF) {

			// as long as the loop still has elements...
			if(resultsF.length > 0) {

				var keyF = 0,
				lastHourF = TimestampService.lastHour(), // the last hour that ended (if 7:15pm, then 7pm)
				lastRanF = resultsF[keyF].ended_unix, // used to determine how many hours ago we last ran this
				hoursSinceLastRanF = (lastHourF - lastRanF) / 60 / 60; // needed for calculating total krai to payout depending on hours
	  			
	  			recordsF.push({
	      			created_unix: resultsF[keyF].created_unix,
	      			started_unix: resultsF[keyF].started_unix,
	      			hoursSinceLastRan: hoursSinceLastRanF,
	      			lastHour: lastHourF,
	      			lastRan: lastRanF,
	      		});

	  			// remove the first element from the array
	      		resultsF.splice(0,1);

	      		// pass the lesser results to the loop again til empty
	      		loopDtResults(resultsF);

	      	} else {
	      		callbackF(null, recordsF);
	      	}
		};

		DistributionTracker.native(function(errF, collectionF) {
			if (!errF) {

				var findF = {
					finalized: paramsF.finalized,
					created_unix: {
						'$lt': TimestampService.unix() - 60
					}
				};

				// ensure we don't accidentally grab a record that minutely realtime cron just created.
				collectionF.find(findF).limit(paramsF.limit).sort({ '$natural': -1 }).toArray(function (errF, resultsF) {
					if (!errF) {
						loopDtResults(resultsF);
					} else {
						callbackF(errF, null);
					}
				});
			} else {
				callbackF(errF, null);
			}
		});
	},

	/**
	 * Upsert a realtime DistributionTracker record
	 */
	update: function(dataU, callbackU) {

		var created_unix;

		// we don't want to overwrite created if we are updating.
		if(dataU.created_unix) {
			created_unix = dataU.created_unix;
		} else {
			created_unix = TimestampService.unix();
		}

        var payloadU = {
            created_unix: created_unix,
            started_unix: dataU.started_unix,
            ended_unix: dataU.ended_unix,
            accounts: dataU.accounts,
            successes: dataU.successes,
            finalized: dataU.finalized
        };

        var whereU = {
			started_unix: payloadU.started_unix
		};

		//console.log(TimestampService.utc() + ' Update Where');
		//console.log(TimestampService.utc() + ' ' + JSON.stringify(whereU));

		//console.log(TimestampService.utc() + ' Update Data');
		//console.log(TimestampService.utc() + ' ' + JSON.stringify(payloadU));

		DistributionTracker.native(function(errU, collectionU) {
			if (!errU) {

				collectionU.update(whereU, payloadU, { upsert: true }, function (errU, updatedU) {
					if (!errU) {
						callbackU(null, true);
					} else {
						callbackU(errU, null);
					}
                });
            } else {
                callbackU(errU, null);
            }
        });
	}
};