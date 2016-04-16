/**
* AvailableSupply.js
*
* @description :: The amount of rai in public supply
*/

module.exports = {

	attributes: {
		// unix timestamp
		modified: {
			type:'integer',
			required:true,
			unique: false
		},
		// amount available in public supply
		amount: {
			type:'integer',
			required:true,
			unique: false
		}
	}
};

