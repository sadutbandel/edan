/**
 * RaiBlock's RPC Service
 *
 * Performs an HTTP request to the RB RPC
 */

module.exports = {

	callRpc: function(postData, callback) {

		var 
		http = require('http'),
		postData = JSON.stringify(postData);

		// request options
		var options = {
			hostname : Globals.rpcHost,
			port : Globals.rpcPort,
			method : 'POST',
			headers : { 
				'Content-Type': 'application/json',
				'Content-Length': postData.length,
				'Accept': '*/*' 
			}
		};

		// define request
		var req = http.request(options, function(res) {

		    // response data
		    res.on('data', function(resp) {

		    	payload = {
	    			statusCode: res.statusCode,
	    			response: resp.toString() // errors come in strings
	    		};

		    	if(res.statusCode === 400) {
		    		callback(payload, null);
		    	} else {
		    		payload.response = JSON.parse(payload.response); // responses come in objects
		    		callback(null, payload);
		    	}
		    });
		});

		// send post daaderta in request
		req.write(postData);

		// end request
		req.end();

		// watch for errors
		req.on('error', function(err) {
			callback(err, null);
		});
	}
}