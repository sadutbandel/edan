/**
* DistributeService.js
*
* validate();
* violators();
* process(); (runs both and update record)
*/

module.exports = {

	/**
	 * 1st, validate the parameter input
	 * 2nd, validate the ReCaptcha response
	 * 3rd, validate the account
	 *
	 * Returns a response object with properties:
	 *
	 * 'valid' (required) whether or not all validators passed
	 * 'item' (optional) name of the item that failed validation
	 */
	validate: function(parameters, callback) {

		ValidateParametersService.validate(parameters, function(err, resp) {
			
			if(!err) {

				ValidateRecaptchaService.validate(parameters.response, function(err, resp) {
					
					if(!err) {

						ValidateAccountService.validate(parameters.account, function(err, resp) {
							
							if(!err) {
								callback(null, true);
							} else {
								callback('account' , null);
							}
						});
					} else {
						callback('recaptcha', null);
					}
				});
			} else {
				callback('parameters', null);			
			}
		});
	},

	/**
	 * Discover any distribution service violators
	 */
	violators: function(payload, callback) {
			
		Distribute.native(function(err, collection) {
			if (!err){

				collection.aggregate([{ 
					'$match' : payload
				}]).toArray(function (err, results) {
					if (!err) {

						/**
						 * No matches found. (good) CONTINUE request!
						 * 
						 * If NO matches are found on an IP, account, or sessionID AND status is 'accepted' 
						 * AND more than the required amount of time has passed we know they are
						 * eligible for a distribution request.
						 */
						
						if(Object.keys(results).length === 0) {
							callback(null, true);
						}
						/**
						 * Matches found. (bad) HALT request!
						 * 
						 * If a match is found on an IP, account, or sessionID AND status is 'accepted' AND 
						 * less than the required amount of time has passed we know a request for 
						 * distribution was recently processed because it matches one of those elements 
						 * in the payload. We can't proceed with a distribution request.
						 */
						else {
							callback(true, null);
						}
					} else {
						callback({ error: err }, null);
					}
				});
			} else {
				callback({ error: err }, null);
			}
		});
	},

	/**
	 * Attempt to process the distribution request after validating input and checking for violations
	 */
	process: function(parameters, callback) {

		/**
		 * Validation Security-Layer Elements
		 * parameters
		 * recaptcha response
		 * account
		 *
		 * Returns true for success
		 * Returns object with 'field' property for item that failed
		 */
		DistributeService.validate(parameters, function(err, resp) {
			
			if(!err) {

				/**
				 * Find recent distribute records
				 *
				 * Find matches of xrb account, ip, or sessionID that occured less than 10s ago
				 * Matches are records that are expired indicating the user is NOT in violation.
				 */
				var tenSecondsAgo = TimestampService.unix() - Globals.distributionTimeout;

				var payload = {

					'$or': [
						{ account: parameters.account },
						{ ip: parameters.ip },
						{ sessionID: parameters.sessionID }
					],

					'$and': [
						{
							modified : { 
			 					'$gt': tenSecondsAgo
			 				}
			 			},
			 			{ 
			 				_id: { 
			 					'$ne': Distribute.mongo.objectId(parameters.createdID)
			 				}
			 			}
		 			]
				};

				DistributeService.violators(payload, function(err, resp) {

					/**
					 * No violations found
					 *
					 * Continue with marking the status 'accepted'
					 */
					if(!err) {

						var payload = {
							modified : TimestampService.unix(),
							account: parameters.account,
							ip: parameters.ip,
							sessionID: parameters.sessionID,
							status: 'accepted'
						};

						Distribute.update({ id: parameters.createdID }, payload).exec(function (err, updated){
							
							/**
							 * Updating status to 'accepted' was a success!
							 *
							 * Return a unix timestamp 'until' which is the record's modified time plus acceptable timeout
							 */
							if (!err) {
								var success = {
									until: updated[0].modified + Globals.distributionTimeout,
									message: 'wait'
								};
								callback(null, success);
							} else {
								callback({ message: err }, null); // there was a problem updating 'accepted' record?
							}
						});							 								
					}
					/**
					 * Violations found!
					 *
					 * Continue with marking the status 'violation'
					 */
					else {
						callback({ message: 'try_again', status: 'violation' }, null);
					}
				});
			} 

			else {
				callback({ message: err }, null); // message can only equal 'parameters' or 'recaptcha' or 'account'
			}
		});
	}
}