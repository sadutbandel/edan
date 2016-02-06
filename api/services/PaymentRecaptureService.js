/**
 * Recapture the funds that were sent during the demo by sending them to our holding address defined in Globals.js model.
 */

module.exports = {

	init: function(account, callback) {
			
		parameters = [];
		parameters.wallet = sails.config.wallet;
		parameters.amount = 1000;
		parameters.source = account;
		parameters.destination = Globals.holdingAddress;

		SendRaiService.send(parameters, function(err, res) {

			if(!err) {
				callback(null, res);
			} else {
				callback(err, null);
			}
		});
 	}
};