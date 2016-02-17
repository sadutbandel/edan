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
		this.parameters = [];
		this.parameters.account = req.body.account;
		this.parameters.response = req.body.response;

		FreeRai.processRequest(this.parameters, function(err, resp) {

			if(!err) {
				resp.response.message = 'claimed';
				res.send(resp);
			} else {
				res.send(err);
			}
		});
	}
};