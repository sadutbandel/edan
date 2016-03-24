module.exports = {

 	// make sure no funny business is going on
 	lolwut: function(parameters, callback) {

 		console.log('sessionID');
		console.log(parameters['sessionID']);

		console.log('account');
		console.log(parameters['account']);

		console.log('timestamp');
		console.log(TimestampService.unix());

 		callback(null, 'Not a dick!');
 	}
}