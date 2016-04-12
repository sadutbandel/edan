/**
* PayoutSchedule.js
*
* @description :: The total # of mrai getting paid out & the interval in which it's getting paid out
*              	  Only the most recent record will be used when considering payouts
*/

module.exports = {

	attributes: {
		
		// total mrai to payout
		total_mrai: {
			type:'string',
			required:true,
			unique: false
		},
		// created unixtime
		created_unix: {
			type:'integer',
			required:true,
			unique: true
		}
	}
};