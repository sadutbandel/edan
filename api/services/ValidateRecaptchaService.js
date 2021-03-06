/**
 * Make a remote call to the Google Recaptcha Verification server
 * @type {[type]}
 */
 module.exports = {

 	// make sure the recaptcha response is valid with Google
 	validate: function(response, callback) {

 		// response can't be undefined or null
 		if(response === undefined || response === null) {
 			callback( { message: 'recaptcha_error' }, null);
 		} else {
 			// continue after validation response is something
	 		var 
	 		https = require('https'),
	 		secret = Globals.recaptchaSecret,
	 		options = {
	 			host : 'www.google.com',
	 			port : 443,
	 			path : '/recaptcha/api/siteverify?secret=' + secret + '&response=' + response,
	 			method : 'GET'
	 		},

	 		req = https.request(options, function(res) {

			    // response data
			    res.on('data', function(response) {

			    	response = JSON.parse(response.toString());
			    	
			    	// success
			    	if(response.success) {
			    		callback(null, response);
			    	} else {
			    		callback( { message: 'recaptcha_error' }, null);
			    	}	
			    });
			});

			//perform curl
			req.end();

			// watch for errors
			req.on('error', function(err) {
				callback(err, null);
			});
		}
	}
};