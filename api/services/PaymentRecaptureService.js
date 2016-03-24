/**
 * Recapture the funds that were sent during the demo by sending them to our holding address defined in Globals.js model.
 */

module.exports = {

	init: function(obj, callback) {
		
		if(obj.balance > 0) {

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
		} else {
			var message = 'No account balance to recapture';
			console.log(TimestampService.utc() + ' ' + message);
			callback(null, { response: message });
		}
 	}
};