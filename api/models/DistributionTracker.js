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
	 * 	finalized: true/false,
	 * 	paid: true/false
	 * }
	 *
	 * Returns { lastHour, lastRan, hoursSinceLastRan }
	 */
	last: function(params, callback) {

		DistributionTracker.native(function(err, collection) {
			if (!err){

				var minuteAgo = TimestampService.unix() - 60;

				var find = {
					finalized: params.finalized,
					created_unix: {
						'$lt': minuteAgo
					}
				};

				if(params.paid) {
					find.paid = params.paid;
				}

				// ensure we don't accidentally grab a record that minutely realtime cron just created.
				collection.find(find).limit(1).sort({ '$natural': -1 }).toArray(function (err, results) {
					if (!err) {

						if(results.length > 0) {

							var lastHour = TimestampService.lastHour(), // the last hour that ended (if 7:15pm, then 7pm)
							lastRan = results[0].ended_unix, // used to determine how many hours ago we last ran this
							hoursSinceLastRan = (lastHour - lastRan) / 60 / 60; // needed for calculating total krai to payout depending on hours
				      		
				      		callback(null, {
				      			created_unix: results[0].created_unix,
				      			started_unix: results[0].started_unix,
				      			hoursSinceLastRan: hoursSinceLastRan,
				      			lastHour: lastHour,
				      			lastRan: lastRan,
				      		});
				      	} else {
				      		callback('no results dt', null);
				      	}
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

		var created_unix;

		// we don't want to overwrite created if we are updating.
		if(data.created_unix) {
			created_unix = data.created_unix;
		} else {
			created_unix = TimestampService.unix();
		}

        var payload = {
            created_unix: created_unix,
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