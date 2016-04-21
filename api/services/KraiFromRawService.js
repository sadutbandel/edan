/**
 * Krai from raw RPC
 *
 * Divide a raw amount down by the Krai ratio.
 * Request:
 * { "action": "krai_from_raw", "amount": "1000000000000000000000000000000000" }
 * Response:
 * { "amount": "1" }
 */

module.exports = {

	convert: function(krai, callback) {

		this.payload = {
			action: 'krai_from_raw',
			amount: krai
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