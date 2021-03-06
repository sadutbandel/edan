/**
 * RPC for 'payment_wait'
 *
 * Wait for payment to arrive in 'account' or until 'timeout' milliseconds have elapsed.
 * After timeout has been exceeded, it's on the application to paymentWait again, which it does.
 * 
 * Request:
 * 		{ "action": "payment_wait", "account": "U63Kt3B7yp2iQB4GsVWriGv34kk2qwhT7acKvn8yWZGdNVesJ8", "amount": "1", "timeout": "1000" }
 * Response:
 * 		{ "status" : "{\"success\"}" }
 */

module.exports = {

	init: function(account, callback) {

		RpcService.callRpc({
			action: 'payment_wait',
			account: account,
			amount: '1000000000000000000000000000000', // 1 Mrai required
			timeout: '120000' // 2-min timeout
		}, function(err, resp) {

			if(!err) {
				callback(null, resp);
			} else {
				callback(err, null);
			}
		});
	}
};