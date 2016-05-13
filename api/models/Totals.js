/**
* Totals.js
*
* @description :: Keep track of the total count of distribution successes per period per account.
* 
* WARNING: Compound-index on account and started_unix for assuring uniqueness.
* 		   
* 		   db.totals.createIndex( { account: 1, started_unix: 1 }, { unique: true } )
*/

module.exports = {

	autoCreatedAt: false,
	autoUpdatedAt: false,

	attributes: {

		// payee account
		account: {
			type: 'string',
			required: true,
			unique: false
		},
		// payee IP
		ip: {
			type: 'string',
			required: true,
			unique: false
		},
		// start of period
		started_unix: {
			type: 'integer',
			required: true,
			unique: false
		},
		// end of period
		ended_unix: {
			type: 'integer',
			required: true,
			unique: false
		},
		// last time record was modified
		modified_unix: {
			type: 'integer',
			required: true,
			unique: false
		},
		// total successful solve count
		total_count: {
			type: 'integer',
			required: true,
			unique: false
		},
		// percentage of the total owed
		percentage_owed: {
			type: 'string',
			required: true,
			unique: false
		},
		// my krai owed for period
		krai_owed: {
			type: 'string',
			required: true,
			unique: false
		},
		// my raw rai owed for period ( for sending )
		raw_rai_owed: {
			type: 'string',
			required: true,
			unique: false
		},
		// paid unix time
		paid_unix: {
			type: 'integer',
			required: true,
			unique: false
		},
		// block hash receipt
		receipt_hash: {
			type: 'string',
			required: false, // although we always set it, even to "" to indicate a realtime row record.
			unique: false
		}
	},

 	/**
	 * Distribution Request
 	 * 
 	 * First, check to see if the session start timer is expired and ready.
 	 * Second, validate all parameters passed (parameters, recaptcha, account).
 	 * Third, find the all totals record for the requesting user. Used for most recent unended period & all past distributions.
 	 * Fourth, check if the results are empty and if so, create a template record.
 	 * Fifth, check to see if this record is expired and ready.
 	 * Sixth, check if this requesting IP or account is in violation of the time-limit. Session excluded since IP covers that.
 	 * Seventh, upsert the totals record with a new payload or an updated one.
 	 */
	request: function(parameters, callback) {

		// 1
		checkIfSessionReady = function() {

			Totals.checkExpired(parameters.sessionStarted, function(err, resp) {

				// session timer is expired. continue!
				if (!err) {
					validation();
				} else {
					callback({ message: 'try_again' }, null); // session timer not expired!
				}
			});
		};

		// 2
		validation = function() {

			ValidateParametersService.validate(parameters, function(err, resp) {
				
				if(!err) {

					ValidateRecaptchaService.validate(parameters.response, function(err, resp) {
						
						if(!err) {

							ValidateAccountService.validate(parameters.account, function(err, resp) {
								
								if(!err) {
									fetchTotalsRecords();
								} else {
									callback('account_error' , null);
								}
							});
						} else {
							callback('recaptcha_error', null);
						}
					});
				} else {
					callback(err + '_error', null);			
				}
			});
		};

		// 3
		fetchTotalsRecords = function() {

	        Totals.native(function(err, collection) {
				if (!err){
					collection.find({ account: parameters.account }).sort({ 'started_unix': -1 }).toArray(function (err, results) {
						if (!err) {
							checkTotalsResults(results);
						} else {
							callback({ message: 'server_error' }, null); // error with mongodb
						}
					});
				} else {
					callback({ message: 'server_error' }, null); // error with mongodb
				}
			});
		};

		// 4
		checkTotalsResults = function(results) {

			// if the first element is not an unended period, we know we need to create one.
			if(results[0].ended_unix !== 0) {

				results.unshift({
				    paid_unix: 0,
				    receipt_hash: '',
				    account: parameters.account,
				    total_count: 0,
				    started_unix: TimestampService.unix(),
				    modified_unix: 0,
				    ended_unix: 0,
				    percentage_owed: 0,
				    krai_owed: 0,
				    raw_rai_owed: '0'
				});
			}

			checkIfRecordReady(results);
		};	

		// 5
		checkIfRecordReady = function(results) {

			Totals.checkExpired(results[0].modified_unix, function(err, resp) {

				// session timer is expired. continue!
				if (!err) {
					upsertTotalsRecord(results);
				} else {
					callback({ message: 'try_again' }, null); // session timer not expired!
				}
			});
		};

		// 6
		checkViolations = function(results) {

			
		};

		// 7
		upsertTotalsRecord = function(results) {

			// update their record with an increased count by 1.
			Totals.native(function(err, collection) {
				if (!err) {

					// increase count by 1.
					results[0].total_count++;

					collection.update({ account: results[0].account, started_unix: results[0].started_unix }, results[0], { upsert: true }, function (err, upserted) {
						if (!err) {
							callback(null, { message: 'success', records: results });
						} else {
							callback({ message: 'server_error' }, null); // error with mongodb
						}
					});
				} else {
					callback({ message: 'server_error' }, null); // error with mongodb
				}
			});
		};

		// Initiates the entire request process
		checkIfSessionReady();
	},

	/*
 	 * Determine if a record is expired
 	 * Accepts a unix timestamp for comparison against now.
 	 */
 	checkExpired: function(unixtime, callback) {

		var elapsedTime = TimestampService.unix() - unixtime;

		// (!err) record is expired, returns success
		if (elapsedTime >= Globals.distributionTimeout) {
			callback(null, true);
		} 
		// (err) record isn't expired, returns error
		else {
			var timeLeft = Globals.distributionTimeout - elapsedTime;
			callback(timeLeft, null);
		}
 	},
};