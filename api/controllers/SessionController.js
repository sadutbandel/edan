/**
 * SessionController
 *
 * @description :: Responsible for creating a 1-minute timer on all new sessions
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	
	append: function (req, res) {

		// create a new session timer if it does not exist
		if(!req.session.started) {
			req.session.started = TimestampService.unix();
		}

		// return the app view
		res.view('application');
	}
};