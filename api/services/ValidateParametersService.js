module.exports = {

 	// make sure parameters aren't undefined or zero-length
 	validate: function(parameters, callback) {

 		// no problems by default
 		var problems = 0;

 		// iterate through all parameters and count problems
 		for(param in parameters) {
 			if(parameters[param] === undefined || parameters[param].length === 0) {
 				problems++;
 			}
 		}

 		// no problems!
 		if(problems === 0) {
 			callback(null, true);
 		} else { // problems...
 			callback(true, null);
 		}
 	}
}