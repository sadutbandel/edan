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
	 * Grab the most recent tracked distribution that's been finalized
	 *
	 * Returns lastHour, lastRan, & hoursSinceLastRan
	 */
	last: function(callback) {

		DistributionTracker.native(function(err, collection) {
			if (!err){

				collection.find({ finalized: true }).limit(1).sort({ '$natural': -1 }).toArray(function (err, results) {
					if (!err) {

						var lastHour = TimestampService.lastHour(),
						lastRan, // used for front-end countdown timer (replace with 6s hard-coded)
						hoursSinceLastRan; // needed in case we miss a payment window and is used as a mutiplier against hourly_krai

			      		// there are always results, unless it's the first time we're running this
			      		if(results[0]) {
			      			lastRan = results[0].ended_unix; // the last time the calculation script ended
			      		} else { // 1st-time running script, assume all records to start up until last hour.
			      			lastRan = 0; // 0 is the beginning of unix time.
			      		}

			      		// never ran before
			      		if(lastRan === 0) {
			      			hoursSinceLastRan = 'Never';
			      		} else {
			      			hoursSinceLastRan = (lastHour - lastRan) / 60 / 60;
			      		}
			      		
			      		callback(null, {
			      			hoursSinceLastRan: hoursSinceLastRan,
			      			lastHour: lastHour,
			      			lastRan: lastRan
			      		});
					} else {
						callback(err, null);
					}
				});
			} else {
				callback(err, null);
			}
		});
	},

	/**
	 * Upsert a realtime DistributionTracker record where ended_unix === 0
	 */
	update: function(data, callback) {

        var payload = {
            created_unix: TimestampService.unix(),
            started_unix: data.started_unix,
            ended_unix: data.ended_unix,
            accounts: data.accounts,
            successes: data.successes,
            finalized: data.finalized,
            paid: data.paid
        };

        var where = {
			ended_unix: 0
		};

		DistributionTracker.native(function(err, collection) {
			if (!err) {

				collection.update(where, payload, { upsert: true }, function (err, updated) {
					if (!err) {
						callback(null, true);
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