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
		},
		// whether or not all accounts have been paid yet.
		paid: {
			type:'boolean',
			required:true,
			unique: false
		},
	},

	/**
	 * Fetch the most recent DistributionTracker record that matches params.
	 *
	 * params = {
	 * 	limit: <positive integer>,
	 * 	finalized: true/false,
	 * 	paid: true/false
	 * }
	 *
	 * Returns { lastHour, lastRan, hoursSinceLastRan }
	 */
	fetch: function(paramsF, callbackF) {

		var recordsF = [];

		loopDtResults = function(resultsF) {

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

	      		resultsF.splice(0,1);
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

				if(paramsF.paid) {
					findF.paid = paramsF.paid;
				}

				//console.log(TimestampService.utc() + ' DistributionTracker.fetch() find where');
				//console.log(TimestampService.utc() + ' ' + JSON.stringify(findF));

				// ensure we don't accidentally grab a record that minutely realtime cron just created.
				collectionF.find(findF).limit(paramsF.limit).sort({ '$natural': -1 }).toArray(function (errF, resultsF) {
					if (!errF) {

						//console.log(TimestampService.utc() + ' DistributionTracker.fetch() resultsF');
						//console.log(TimestampService.utc() + ' ' + JSON.stringify(resultsF));

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
            finalized: dataU.finalized,
            paid: dataU.paid
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