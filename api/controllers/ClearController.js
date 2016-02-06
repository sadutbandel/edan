/**
 * ClearController
 *
 * @description :: 
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	create: function(req, res) {

		// clear the payment account
		if(req.session.payment) {
			req.session.payment = undefined;
			var str = 'Payment account manually cleared';
			console.log(str);
			res.send(str);
		}
	}
};