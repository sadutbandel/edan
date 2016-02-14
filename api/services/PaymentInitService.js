
/**
 * payment_init RPC
 *
 * Checks whether wallet exist, is unlocked, and marks contained accounts as usable for transactions.
 * 
 * Request:
 * { "action": "payment_init", "wallet": "000D1BAEC8EC208142C99059B393051BAC8380F9B5A2E6B2489A277D81789F3F" }
 * Response:
 * { "status" : "{\"Ready\"}" }
 */

module.exports = {

	init: function(callback) {

		this.payload = {
			action: 'payment_init',
			wallet: sails.config.wallet
		};
		
		RpcService.callRpc(this.payload, function(err, response) {

			if(!err) {
				callback(null, response);
			} else {
				callback(err, null);
			}
		});
	}
};