/**
* AvailableSupply.js
*
* @description :: The amount of Krai in public supply
*/

module.exports = {

	autoCreatedAt: false,
	autoUpdatedAt: false,
	
	attributes: {
		// unix timestamp
		modified: {
			type:'integer',
			required:true,
			unique: false
		},
		// amount available in public supply
		raw_krai: {
			type:'string',
			required:true,
			unique: false
		}
	}
};

