/**
 * Validate an account by checking ValidatedAccounts for the account first.
 * If it exists in ValidatedAccounts, then it's been validated before.
 * If it does not exist in ValidatedAccounts, then it has not been validated before
 * 		and we should store it in ValidatedAccounts and continue with a valid response.
 * @type {Object}
 */
module.exports = {

	// master account-validation call.
	validate: function(account, callback) {
		
        ValidatedAccounts.find({ account: account }, function(err, resp) {

            if(!err) {

            	// account was found! already validated... (most-cases this is what's happening. quick and easy.)
            	if(resp.length > 0) {
                	callback(null, true);
                }

                // account not found! not validated yet... let's validate, then create a record.
                else {

                	ValidateAccountService.validateThenCreate(account, function(err, resp) {

	                	// validated and created!	
						if(!err) {
							callback(null, true);
						}

						// something went wrong with validation RPC (most likely) or creation (unlikely)
						else {
							callback(err, null);
						}
					});
                }
            }

            // account not found in our store... let's validate the account via RPC...
            else {
                callback(err, null);	
            }
        });
	},

	validateRPC: function(account, callback) {

		this.payload = {
			action: 'validate_account_number',
			account: account
		};
		
		RpcService.callRpc(this.payload, function(err, response) {

			if(!err) {

				// valid account
				if(response.response.valid === '1') {
					callback(null, response);
				} 
				// invalid account
				else {
					callback( { message: 'account_error' }, null);
				}

			} else {
				callback(err, null);
			}
		});
	},

	// Validate RPC then create record
	validateThenCreate: function(account, callback) {

		ValidateAccountService.validateRPC(account, function(err, resp) {

        	// validated!	
			if(!err) {

				// store this account in ValidatedAccounts
				ValidatedAccounts.create({ account: account, created_unix: TimestampService.unix() }, function(err, resp) {

					// account was added to ValidatedAccounts
    				if(!err) {						
						callback(null, true);
					} 
					// account 
					else {
						callback(err, null);
					}
				});
			}
			// could not validate.
			else {
				callback(err, null);
			}
		});
	}
};