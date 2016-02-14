/**
 * payment_begin RPC
 *
 * Begin a new payment session. Moves an account from inactive_wallet to active_wallet or puts a new account in active_wallet 
 * 
 * Request:
 * 		{ "action": "payment_begin", "wallet": "000D1BAEC8EC208142C99059B393051BAC8380F9B5A2E6B2489A277D81789F3F" }
 * Response:
 * 		{ "account" : "{\"U63Kt3B7yp2iQB4GsVWriGv34kk2qwhT7acKvn8yWZGdNVesJ8\"}" }
 */

module.exports = {

	init: function(callback) {

		this.payload = {
			action: 'payment_begin',
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