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
	 * Count total success records since the last tracking.
	 */
	calculate: function(callback) {

		// Find the last time we tracked totals and stored counts
		TrackCounter.last(function(err, resp) {
	         
	      	if(!err) {

				// Find records where status is 'accepted'
				// Then group by 'account' with a count
				var match = {
					status: 'accepted'
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