/**
* Totals.js
*
* @description :: Totals model
*/

module.exports = {

	attributes: {

		// payee account
		account: {
			type:'string',
			required:true,
			unique: false
		},
		// start of time range of Distribute records considered
		start_unix: {
			type:'integer',
			required:true,
			unique: false
		},
		// end of time range of Distribute records considered
		end_unix: {
			type:'integer',
			required:true,
			unique: false
		},
		// total 'accepted' distribute records count for time range
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
	 * Count totals by xrb_account
	 */
	calculate: function(callback) {

		// date object rounded off at the last hour that just passed convered to unixtime
		var lastHour = new Date();
		lastHour.setMinutes(0);
		lastHour.setSeconds(0);
		var unix = Math.floor(lastHour.getTime() / 1000);
		console.log(unix);

		var match = {
			status: 'accepted'
		};
		var group = {
			_id: '$account',
			count: { 
				'$sum': 1
			}
		};

		Distribute.native(function(err, collection) {
			if (!err){

				collection.aggregate([{ '$match' : match }, { '$group' : group }]).toArray(function (err, results) {
					if (!err) {

						/**
						 * No matches found. (bad) HALT request!
						 * 
						 * If NO matches are found, then there are no Distribute records yet.
						 */
						
						if(Object.keys(results).length === 0) {
							callback(null, results);
						}
						/**
						 * Matches found. (good) CONTINUE request!
						 * 
						 * If matches ARE found, then we should get a list of accounts with counts.
						 */
						else {
							callback(results, null);
						}
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