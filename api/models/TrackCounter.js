/**
* TrackCounter.js
*
* @description :: Tracks the time-ranges that Totals.js ran to save counts.
* 
*/

module.exports = {

	attributes: {

		// start time the counter used
		start_unix: {
			type:'integer',
			required:true,
			unique: false
		},

		// end time the counter used
		end_unix: {
			type:'integer',
			required:true,
			unique: false
		}
	},

	/**
	 * Count totals by xrb_account
	 */
	track: function(callback) {

	}
};