/**
 * TestController
 *
 * @description :: Server-side logic for managing demo payments
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	// override the GET/fetch route/action for this API call
	fetch: function (req, res) {

		Test.query(function(err, resp) {
			
			if(!err) {
				res.send(resp);
			} else {
				res.send(err);
			}
		});
	}
};