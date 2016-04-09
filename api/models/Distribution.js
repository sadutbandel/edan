/**
* Distribution.js
*
* @description :: Distribution model
*/

module.exports = {

	attributes: {

		account: {
			type:'string',
			required:false,
			unique: false
		},
		// unix timestamp
		modified: {
			type:'integer',
			required:true,
			unique: false
		},

		sessionID: {
			type:'string',
			required:true,
			unique:false
		},

		ip: {
			type:'string',
			required:true,
			unique:false
		},

		status: {
			type:'string',
			required:true,
			unique:false
		}
	},

	/**
	 * Request distribution 
	 */
	request: function(parameters, callback) {

		// Checks the initial-session timer to see if it's expired
		Distribution.checkExpired(parameters.sessionStarted, function(err, resp) {

			/**
			 * Session timer expired. (good) CONTINUE request!
			 * 
			 * If the initial session timer is expired, we know the web-visitor 
			 * has waited the required time & we can continue with the request.
			 */
			
			if (!err) {

				/**
				 * Distribution Request Creation
				 *
				 * Create a new entry where status = 'pending'
				 */
				var payload = {
					modified: parameters.modified,
					account: parameters.account,
					ip: parameters.ip,
					sessionID: parameters.sessionID,
					status: 'pending'
				};

				Distribution.create(payload).exec(function (err, results) {
		 			if(!err) {

		 				// the id created by mongodb is used in DistributionService.process()
		 				parameters.createdID = results.id;

		 				/**
		 				 * Validation & Violation Layer
		 				 *
		 				 * Returns true for success
		 				 * Returns an object with error message for failure
		 				 */
		 				DistributionService.process(parameters, function(error, resp) {

		 					if(!error) {
		 						callback(null, resp);
		 					} else {
		 						
		 						/**
				 				 * Validation fail OR Violation occurred...
				 				 *
				 				 * Update the 'pending' Distribution record as 'violation'
				 				 * OR as 'parameters' or 'recaptcha' or 'account'
				 				 * Returns true for success
				 				 * Returns an object for failures with information as to why
				 				 */
		 						var payload = {
		 							modified : TimestampService.unix(),
									account: parameters.account,
									ip: parameters.ip,
									sessionID: parameters.sessionID,
									status: error.status
								};

								Distribution.update({ id:results.id }, payload).exec(function (err, updated){
									if (!err) {
										// disregard the record object response 
										callback(null, error); // use err from .process()
									} else {
										callback({ error: err }, null); // error Distribution.update()
									}
								});	
		 					}
		 				});
		 			} else {
		 				callback({ error: err }, null); // error Distribution.create()
		 			}
				});
			} 

			/**
			 * Session timer NOT expired. (bad) HALT request!
			 * 
			 * If the initial 5-minute session timer is NOT expired, we know the web-visitor 
			 * is brand new, opened a private-browsing (incognito) window, or cleared cache.
			 */	
			else {
				res.send({ message: 'wait', wait: err });
			}
		});
	},

 	// determines if a record is expired or not (300s currently)
 	checkExpired: function(timestamp, callback) {

		var elapsedTime = TimestampService.unix() - timestamp;

		// (!err) record is expired, returns success
		if (elapsedTime >= Globals.distributionTimeout) {
			callback(null, true);
		} 
		// (err) record isn't expired, returns error
		else {
			var timeLeft = Globals.distributionTimeout - elapsedTime;
			callback(timeLeft, null);
		}
 	}
};