/**
* Test.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  	attributes: {

  	},

  	query: function(callback) {
		
		var tenSecondsAgo = TimestampService.unix() - Globals.distributionTimeout;

		var payload = {

			'$or': [
				{ account: 'xrb_3efamcqebsbtxxk6hz48buqjq9b1d9kpy6k8c5j5ibm9adxx9wyj4bphwn87' },
				{ ip: '96.247.120.158' },
				{ sessionID: 'Oe9MilEtlL6L0rHQLMYokgPCm8oLEI0-' }
			],

			'$and': [
				{ 
	 				_id: { '$ne': Test.mongo.objectId("57076e49191722af7c7922c5") }
	 			}
 			]
		};

		Distribute.native(function(err, collection) {
			if (!err){

				collection.aggregate([{ 
					'$match' : payload
				}]).toArray(function (err, results) {
					if (!err) {

						if(Object.keys(results).length === 0) {
							console.log('Test.js - No results for collection.aggregate()');
							callback(true, null);
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
							console.log('Test.js - Results for collection.aggregate()');
							console.log(JSON.stringify(results));
							callback(null, results);
						}
					} else {
						callback(err, null);
					}
				});
			} else {
				callback(err, null);
			}
		});
	}
};

