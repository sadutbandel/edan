module.exports = {

 	send: function(parameters, callback) {
		
		this.payload = {
			amount: '1000000000000000000000000000000',
			wallet: sails.config.wallet,
			source: Globals.faucetAddress,
			destination: parameters.account
		}

		SendRaiService.send(this.payload, function(err, resp) {

			if (!err) {
				callback(null, resp);
			} else {
				callback(err, null);
			}
		});
 	}

}