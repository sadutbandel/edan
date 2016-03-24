/**
 * SessionController
 *
 * @description :: Responsible for creating a 1-minute timer on all new sessions
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	
	append: function (req, res) {

		// only create if it doesn't exist
		if(!req.session.started) {
			console.log('Setting new-session timer');
			req.session.started = TimestampService.unix();
		} else {
			console.log('New-session timer already set');
		}

		// return the app view
		res.view('application');
	}
};