/**
 * ValidatedAccounts.js
 *
 * Responsible for storing validated accounts. This will massively alleviate RPC load which should help prevent distribution disrupts.
 */

module.exports = {

	autoCreatedAt: false,
	autoUpdatedAt: false,

	attributes: {

		account: {
			type:'string',
			required:true,
			unique: true
		},

		created_unix: {
			type:'integer',
			required:true,
			unique: false
		}
  	}
};

