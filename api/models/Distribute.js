/**
* Distribute.js
*
* @description :: Distribution model
*/

module.exports = {

	attributes: {

		account: {
			type:'string',
			required:true,
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
		Distribute.checkExpired(parameters.sessionStarted, function(err, resp) {

			/**
			 * Session timer expired. (good) CONTINUE request!
			 * 
			 * If the initial 5-minute session timer is expired, we know the web-visitor 
			 * has waited at least 5 minutes and we can continue with this request.
			 */
			
			if (!err) {

				/**
				 * Find any matches on account, ip, sessionID AND 
				 * where status is 'pending'
				 */
				var payload = {

					'$or': [
						{ account: parameters.account },
						{ ip: parameters.ip },
						{ sessionID: parameters.sessionID }
					],

					'$and': [
						{ status: 'pending' }
					]
				};

				Distribute.native(function(err, collection) {
					if (!err){

						collection.aggregate([{ 
							'$match' : payload
						}]).toArray(function (err, results) {
							if (!err) {
								
								/**
								 * No matches were found. (good) CONTINUE request!
								 * 
								 * If no matches are found on any of these items, create a record so we have a match 
								 * for any further requests on those elements (prevents simultaneous submissions)
								 */
								if(Object.keys(results).length === 0) {

									// explicitly define the params to save in Distribute
									var payload = {
										modified: parameters.modified,
										account: parameters.account,
										ip: parameters.ip,
										sessionID: parameters.sessionID,
										status: 'pending'
									};

									/**
									 * Distribute Request Creation
									 *
									 * Create a new entry where status = 'pending'
									 */
									Distribute.create(payload).exec(function (err, results) {
							 			if(!err) {

							 				// the id created by mongodb is used in DistributeService.process()
							 				parameters.createdID = results.id;

							 				/**
							 				 * Validation & Violation Layer
							 				 *
							 				 * Returns true for success
							 				 * Returns an object for failures with information as to why
							 				 */
							 				DistributeService.process(parameters, function(err, resp) {

							 					if(!err) {
							 						callback(null, resp);
							 					} else {
							 						
							 						/**
									 				 * Violation occurred...
									 				 *
									 				 * Update the 'pending' distribute record as 'violation'
									 				 * Returns true for success
									 				 * Returns an object for failures with information as to why
									 				 */
							 						var payload = {
							 							modified : TimestampService.unix(),
														account: parameters.account,
														ip: parameters.ip,
														sessionID: parameters.sessionID,
														status: err.message
													};

													Distribute.update({ id:results.id }, payload).exec(function (err, updated){
														if (!err) {
															callback(null, updated[0]);
														} else {
															callback({ error: err }, null); // error Distribute.update()
														}
													});	
							 					}
							 				});
							 			} else {
							 				callback({ error: err }, null); // error Distribute.create()
							 			}
									});
								} 

								/**
								 * Matches found. (bad) HALT request!
								 * 
								 * If a match is found on an IP, account, or sessionID AND status is pending
								 * we know there must already be a request open for one of those matching elements.
								 * Because of this we know we can't proceed with a distribution request.
								 */
								else {
									callback({ message: 'try_again' }, null);
								}
							} else {
								callback({ message: err }, null); // error collection.aggregate(()
							}
						});
					} else {
						callback({ message: err }, null); // error Distribute.native()
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

				console.log(TimestampService.utc() + ' ' + req.headers['x-forwarded-for'] + ' ' + req.sessionID + ' [FreeraiController.js] Distribute.checkExpired() (err) ... session timer not expired ... ' + JSON.stringify(err));
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