module.exports = {

 	// make sure our parameters aren't undefined or zero-length
 	verifyParameters: function(parameters, callback) {

 		// no problems by default
 		var problems = 0;

 		// iterate through all parameters and...
 		parameters.forEach(function(parameter) {

 			// make sure they aren't undefined or empty and then...
 			if (parameter === undefined || parameter.length === 0) {

 				// increase our problem count!
 				problems++;
 			}
 		});

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
		
		parameters.amount = '100000000000000000000000000000000';
		parameters.wallet = Globals.paymentWallets.production;
		parameters.source = Globals.faucetAddress;
		parameters.destination = parameters.account;

		SendRaiService.send(parameters, function(err, response) {

			if(!err) {
				callback(null, response);
			} else {
				callback(err, null);
			}
		});
 	}

}