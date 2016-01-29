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

		payload = {};
		payload.action = 'payment_wait';
		payload.account = account;
		payload.amount = '1'.concat(Globals.mrai);
		payload.timeout = '10000'; // 10 seconds timeout

		RpcService.callRpc(payload, function(err, res) {

			if(!err) {
				callback(null, res);
			} else {
				callback(err, null);
			}
		});
	}
};