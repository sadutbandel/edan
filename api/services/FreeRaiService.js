module.exports = {

 	// make sure our parameters aren't undefined or zero-length
 	verifyParameters: function(parameters, callback) {

 		// no problems by default
 		var problems = 0;

 		// iterate through all parameters
 		for (param in parameters) {

 			if (parameters[param] === undefined || parameters[param].length === 0) {

 				// increase our problem count!
 				problems++;
 			}
 		}

 		// no problems? great!
 		if (problems === 0) {

 			// return a success response, with an object where success === true
 			callback(null, { success: true });
 		}

 		// there were problems. doh!
 		else {

 			// return an error response, with an object where success === false
 			callback({ success: false }, null);
 		}
 	},

 	send: function(parameters, callback) {
		
		this.payload = {
			amount: '200000000000000000000000000000000',
			wallet: Globals.paymentWallets.development,
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