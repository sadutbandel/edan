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
	 * Fetch the last DistributionTracker record & generate some numbers
	 */
	last: function(callback) {

		DistributionTracker.native(function(err, collection) {
			if (!err) {
				
				collection.find().limit(1).sort({ 'started_unix': -1 }).toArray(function (err, results) {
					if (!err) {

						var lastHour = TimestampService.lastHour(), // the last hour that ended (if 7:15pm, then 7pm)
						lastRan,
						diff,
						live;

						// if the last period is not ended, lastRan is started_unix
						// otherwise lastRan is ended_unix since we have no realtime records yet.
						if(results[0].ended_unix === 0) {
							lastRan = results[0].started_unix;
							live = true;
						} else {
							lastRan = results[0].ended_unix;
							live = false;
						}

						// the difference in time between the last hour, and the last time it was ran (usually 2hours if on-schedule)						
						diff = lastHour - lastRan;

						// if it's over 0 hours, go ahead with calculations
						if(diff > 0) {
							hoursSincelastRan = (diff) / 60 / 60; // needed for calculating total krai to payout depending on hours
			  			} else {
			  				hoursSincelastRan = 0; // it's been under 1 hour, so 0 hours since we last ran this last.
			  			}

			  			callback(null, {
			      			created_unix: results[0].created_unix,
			      			started_unix: results[0].started_unix,
			      			hoursSinceLastRan: hoursSincelastRan,
			      			accounts: results[0].accounts,
			      			successes: results[0].successes,
			      			lastHour: lastHour,
			      			lastRan: lastRan,
			      			live: live
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