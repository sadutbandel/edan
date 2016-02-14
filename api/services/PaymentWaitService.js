/**
 * payment_wait RPC
 *
 * Wait for payment to arrive in 'account' or until 'timeout' milliseconds have elapsed.
 * 
 * Request:
 * 		{ "action": "payment_wait", "account": "U63Kt3B7yp2iQB4GsVWriGv34kk2qwhT7acKvn8yWZGdNVesJ8", "amount": "1", "timeout": "1000" }
 * Response:
 * 		{ "status" : "{\"success\"}" }
 */

module.exports = {

	init: function(account, callback) {

		this.payload = {
			action: 'payment_wait',
			account: account,
			amount: '1000000000000000000000000000000000',
			timeout: '60000' // 60 seconds timeout
			//timeout: '10000' // 10 seconds timeout for testing
		};
		
		RpcService.callRpc(this.payload, function(err, res) {

			if(!err) {
				callback(null, res);
			} else {
				callback(err, null);
			}
		});
	}
};