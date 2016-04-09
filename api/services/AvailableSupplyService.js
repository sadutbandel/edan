/**
 * Available Supply RPC
 *
 * Returns how many rai are in the public supply
 * 
 * Request:
 * { "action": "available_supply" }
 * Response:
 * { "amount": "450000" }
 */

module.exports = {

	fetch: function(callback) {

		this.payload = {
			action: 'available_supply'
		};
		
		RpcService.callRpc(this.payload, function(err, resp) {
			if(!err) {
				MraiFromRawService.convert(resp.response.available, function(err, resp) {
					if(!err) {
						callback(null, resp.response.amount);
					} else {
						callback(err, null);
					}
				});
			} else {
				callback(err, null);
			}
		});
	}
};