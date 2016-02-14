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
			destination: parameters.destination,
			amount: parameters.amount
		};

		RpcService.callRpc(this.payload, function(err, response) {

			if(!err) {
				callback(null, response);
			} else {
				callback(err, null);
			}

		});
	}
	
}