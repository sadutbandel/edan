/**
* DistributionTracker.js
*
* @description :: Keeps track of distribution calculations for a given time range
* 
*/

module.exports = {

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
		}
	},

	/**
	 * Grab the most recent tracked distribution
	 *
	 * Returns lastHour, lastRan, & hoursSinceLastRan
	 */
	last: function(callback) {

		DistributionTracker.native(function(err, collection) {
			if (!err){

				collection.find().limit(1).sort({'$natural': -1}).toArray(function (err, results) {
					if (!err) {

						var lastHour = TimestampService.lastHour(),
						lastRan,
						hoursSinceLastRan;

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

			      		var response = {
			      			hoursSinceLastRan: hoursSinceLastRan,
			      			lastHour: lastHour,
			      			lastRan: lastRan
			      		};

			      		callback(null, response);
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