/**
 * SessionController
 *
 * @description :: Responsible for creating an initial-timer on all new sessions
 *                 Returning users don't require a new session.started time.
 *                 Distribution uses this timer to ensure new-sessions can't be
 *                 created at a whim for use in the distribution form.
 */

module.exports = {
	
	append: function (req, res) {

		if(!req.session.started) {
			req.session.started = TimestampService.unix();
		}

		// return the user to the SPA
		res.view('application');
	}
};