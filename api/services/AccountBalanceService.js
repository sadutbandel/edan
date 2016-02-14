/**
 * Return the balance for a specific account
 *
 * Request:
 * { "action": "account_balance", "account": "U63Kt3B7yp2iQB4GsVWriGv34kk2qwhT7acKvn8yWZGdNVesJ8" }
 * Response:
 * { "balance": "10000" }
 */

module.exports = {

	init: function(account, callback) {
			
		this.payload = {
			action: 'account_balance',
			account: account
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