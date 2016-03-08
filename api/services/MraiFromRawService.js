/**
 * Mrai from raw RPC
 *
 * Divide a raw amount down by the Mrai ratio.
 * Request:
 * { "action": "mrai_from_raw", "amount": "1000000000000000000000000000000" }
 * Response:
 * { "amount": "1" }
 */

module.exports = {

	convert: function(mrai, callback) {

		this.payload = {
			action: 'mrai_from_raw',
			amount: mrai
		};
		
		RpcService.callRpc(this.payload, function(err, resp) {
			if(!err) {
				callback(null, resp);
			} else {
				callback(err, null);
			}
		});
	}
};