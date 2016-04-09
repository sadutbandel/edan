/**
* TrackCounter.js
*
* @description :: Tracks the time-ranges that Totals.js ran to save counts.
* 
*/

module.exports = {

	attributes: {
		// created unixtime
		created_unix: {
			type:'integer',
			required:true,
			unique: false
		},
		// start unixtime the counter used
		start_unix: {
			type:'integer',
			required:true,
			unique: false
		},
		// end unixtime the counter used
		end_unix: {
			type:'integer',
			required:true,
			unique: false
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
	 * Grab the most recent tracked count
	 */
	last: function(callback) {

		TrackCounter.native(function(err, collection) {
			if (!err){

				collection.find().limit(1).sort({'$natural': -1}).toArray(function (err, results) {
					if (!err) {
						/**
						 * No matches found. (that's fine) CONTINUE request
						 */
						if(Object.keys(results).length === 0) {
							callback(null, true);
						}
						/**
						 * Matches found. (that's fine) CONTINUE request
						 * 
						 * If matches ARE found, then we should get a list of accounts with counts.
						 */
						else {
							callback(null, results);
						}
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