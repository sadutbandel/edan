/**
 * payment_end RPC
 *
 * End a payment session. Take the associated account out of 'active_wallet' and put it in to 'inactive_wallet'. 
 * 
 * Request:
 * 		{ "action": "payment_end", "account": "U63Kt3B7yp2iQB4GsVWriGv34kk2qwhT7acKvn8yWZGdNVesJ8", "wallet": "FFFD1BAEC8EC20814BBB9059B393051AAA8380F9B5A2E6B2489A277D81789EEE" }
 * Response:
 * 		{ "account" : "{\"U63Kt3B7yp2iQB4GsVWriGv34kk2qwhT7acKvn8yWZGdNVesJ8\"}" }
 */

module.exports = {

	init: function(account, callback) {

		this.payload = {
			action: 'payment_end',
			account: account,
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