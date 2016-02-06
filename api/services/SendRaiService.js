module.exports = {

	/*
	Send a specified amount of coins to a specified account
	parameters (account_id, amount)
	 */
	send: function(parameters, callback) {

		payload = {
			action: 'send',
			wallet: sails.config.wallet,
			source: parameters.source,
			destination: parameters.destination,
			amount: parameters.amount.toString().concat(Globals.mrai)
		};

		RpcService.callRpc(payload, function(err, response) {

			if(!err) {
				callback(null, response);
			} else {
				callback(err, null);
			}

		});
	}
	
}