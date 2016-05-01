/**
 * Block Count RPC
 *
 * Reports the number of blocks in the ledger
 * Request:
 * { "action": "block_count" }
 * Response:
 * { "count": "1000" }
 */

module.exports = {

	fetch: function(callback) {

		RpcService.callRpc({
			action: 'block_count'
		}, function(err, resp) {
			if(!err) {
				callback(null, resp);
			} else {
				callback(err, null);
			}
		});
	}
};