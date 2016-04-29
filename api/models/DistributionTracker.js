/**
* DistributionTracker.js
*
* @description :: Keeps track of distribution data for each period
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
		started_unix: {
			type:'integer',
			required:true,
			unique: false
		},
		ended_unix: {
			type:'integer',
			required:true,
			unique: true
		},
		accounts: {
			type:'integer',
			required:true,
			unique: false
		},
		successes: {
			type:'integer',
			required:true,
			unique: false
		},
		finalized: {
			type:'boolean',
			required:true,
			unique: false
		}
	},

	/**
	 * Fetch the last DistributionTracker record
	 *
	 * Returns { lastHour, lastRan, hoursSinceLastRan }
	 */
	last: function(callbackF) {

		DistributionTracker.native(function(errF, collectionF) {
			if (!errF) {
				
				collectionF.find().limit(1).sort({ 'started_unix': -1 }).toArray(function (errF, resultsF) {
					if (!errF) {
						
						//console.log(TimestampService.utc() + ' resultsF');
						//console.log(TimestampService.utc() + ' ' + JSON.stringify(resultsF));

						var keyF = 0,
						lastHourF = TimestampService.lastHour(), // the last hour that ended (if 7:15pm, then 7pm)
						lastRan,
						diff;

						// if the last record is a non-finalized, realtime record...
						if(resultsF[keyF].ended_unix === 0) {
							lastRanF = resultsF[keyF].started_unix;
						}

						// if the last record is a finalized, historical record...
						else {
							lastRanF = resultsF[keyF].ended_unix;
						}
							
						// the difference in time between the last hour, and the last time it was ran (usually 2hours if on-schedule)						
						diff = lastHourF - lastRanF;

						// if it's over 0 hours, go ahead with calculations
						if(diff > 0) {
							hoursSinceLastRanF = (diff) / 60 / 60; // needed for calculating total krai to payout depending on hours
			  			} else {
			  				hoursSinceLastRanF = 0; // it's been under 1 hour, so 0 hours since we last ran this last.
			  			}

			  			callbackF(null, {
			      			created_unix: resultsF[keyF].created_unix,
			      			started_unix: resultsF[keyF].started_unix,
			      			hoursSinceLastRan: hoursSinceLastRanF,
			      			lastHour: lastHourF,
			      			lastRan: lastRanF
			      		});
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

		//console.log(TimestampService.utc() + ' Update DT Where');
		//console.log(TimestampService.utc() + ' ' + JSON.stringify(whereU));

		//console.log(TimestampService.utc() + ' Update DT Data');
		//console.log(TimestampService.utc() + ' ' + JSON.stringify(payloadU));

		DistributionTracker.native(function(errU, collectionU) {
			if (!errU) {

				collectionU.update(whereU, payloadU, { upsert: true }, function (errU, updatedU) {
					if (!errU) {
						//console.log(TimestampService.utc() + ' Updated DT');
						//console.log(TimestampService.utc() + ' ' + JSON.stringify(updatedU));
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