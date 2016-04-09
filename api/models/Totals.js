/**
* Totals.js
*
* @description :: Count the total distribution records per account
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
		start_unix: {
			type:'integer',
			required:true,
			unique: false
		},
		// end of time range of the Distribution records considered
		end_unix: {
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
		// time when they were paid
		paid_unix: {
			type:'integer',
			required:true,
			unique: false
		}
	},

	/**
	 * Count total success records per account since the last tracking.
	 */
	calculate: function(callback) {

		// find the last time we calculated & stored totals per account
		// if we find results (we always will except the first time we run this), then use the most recent end timestamp
		// as the 'greater than or equal to', with the hour that just passed being the 'less than'.
		// 
		TrackCounter.last(function(err, resp) {
	         
	      	if(!err) {

	      		var lastRan;

	      		// if there are results(99.9% of cases)
	      		if(resp[0]) {
	      			lastRan = resp[0].end_unix; // the last time the calculation script ended
	      		} else {// 1st-time running script, assume all records to start up until last hour.
	      			lastRan = 0; // 0 is the beginning of unix time.
	      		}

				// Find records where status is 'accepted' and the modified time is greater than 
				// or equal to the end time of when the last time totals were calculated but also
				// less than the end of the most recent hour, which the function is using as the end.
				// Also, group by 'account' with a total count.
				var match = {

					'$and': [
						{
							modified : { 
			 					'$lt': TimestampService.lastHour()
			 				}
			 			},
						{
							modified : { 
			 					'$gte': lastRan
			 				}
			 			},
			 			{ 
			 				status: 'accepted'
			 			}
		 			]
				};
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

									// store results in Totals.
									callback(null, results);
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
	}
};