module.exports = {

 	validate: function(parameters, callback) {

 		// 0 problems to start
 		var problems = [];

 		// only go through account and recaptcha response
 		var params = {
 			account: parameters.account,
 			recaptcha: parameters.response,
 		};

 		// iterate through all params and identify problems
 		// can't be undefined or equal nothing
 		for(param in params) {

 			if(params[param] === null || params[param] === undefined || params[param].length === 0) {
 				problems.push(param);
 			}
 		}

 		// ensure the account is prefixed with 'xrb_'
 		if(param === 'account') {
 			if(param.lastIndexOf('xrb_', 0) !== 0) {
 				problems.push(param);
 			}
 		}

 		// in the array of problems, output the first one found.
 		if(problems.length > 0) {
 			callback(problems[0], null);
 		} else {
 			callback(null, true);
 		}
 	}
}