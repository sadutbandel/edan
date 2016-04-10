/**
* PayoutSchedule.js
*
* @description :: The total # of mrai getting paid out & the interval in which it's getting paid out
*/

module.exports = {

	attributes: {
		
		// total mrai to payout
		total_mrai: {
			type:'string',
			required:true,
			unique: false
		},
		// start unixtime the counter used
		hour_interval: {
			type:'integer',
			required:true,
			unique: false
		},
		// created unixtime
		created_unix: {
			type:'integer',
			required:true,
			unique: false
		},
		expired: {
			type:'boolean',
			required:true,
			unique: false
		}
	}
};