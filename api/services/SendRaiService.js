module.exports = {

	/*
	Send a specified amount of coins to a specified account
	parameters (account_id, amount)
	 */
	send: function(parameters, callback) {

		this.payload = {
			action: 'send',
			wallet: parameters.wallet,
			source: parameters.source,
			destination: parameters.destination.toLowerCase(),
			amount: parameters.amount
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