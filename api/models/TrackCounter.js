/**
* TrackCounter.js
*
* @description :: Tracks the time-ranges and t
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
	}
};