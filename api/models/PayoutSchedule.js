/**
* PayoutSchedule.js
*
* @description :: The total # of krai getting paid out & the interval in which it's getting paid out
*              	  Only the most recent record will be used when considering payouts
*/

module.exports = {

	autoCreatedAt: false,
	autoUpdatedAt: false,
	
	attributes: {
		
		// total krai to pay out per hour
		hourly_rai: {
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