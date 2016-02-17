/**
 * Retrieve block service
 *
 * Accept a hash and retrieve a block
 * 
 * Request:
 * { "action": "block", "hash": "000D1BAEC8EC208142C99059B393051BAC8380F9B5A2E6B2489A277D81789F3F" }
 * Response:
 * { "contents" : "{ "type": "open", "account": "FA5B51D063BADDF345EFD7EF0D3C5FB115C85B1EF4CDE89D8B7DF3EAF60A04A4", "representative": "FA5B51D063BADDF345EFD7EF0D3C5FB115C85B1EF4CDE89D8B7DF3EAF60A04A4", "source": "FA5B51D063BADDF345EFD7EF0D3C5FB115C85B1EF4CDE89D8B7DF3EAF60A04A4", "work": "0000000000000000", "signature": "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" }" }
 */

module.exports = {

	init: function(hash, callback) {

		this.payload = {
			action: 'block',
			hash: hash
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