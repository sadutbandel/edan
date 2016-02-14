/**
 * Recapture the funds that were sent during the demo by sending them to our holding address defined in Globals.js model.
 */

module.exports = {

	init: function(obj, callback) {
			
		this.payload = {
			wallet: sails.config.wallet,
			amount: obj.balance,
			source: obj.account,
			destination: Globals.holdingAddress
		};
		
		SendRaiService.send(this.payload, function(err, res) {

			if(!err) {
				callback(null, res);
			} else {
				callback(err, null);
			}
		});
 	}
};