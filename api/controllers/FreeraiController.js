/**
 * FreeCoinsController
 *
 * @description :: Server-side logic for managing freecoins
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	// override the POST/create route/action for this API call
	create: function (req, res) {
		
		// 2 required parameters (account, response)
		parameters = [];
		parameters.account = req.body.account;
		parameters.response = req.body.response;

		FreeRai.processRequest(parameters, function(err, response) {

			if(!err) {
				response.message = 'claimed';
				res.send(response);
			} else {
				res.send(err);
			}
		});
	}
};