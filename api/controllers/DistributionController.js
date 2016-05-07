/**
 * DistributionController
 *
 * @description :: 
 */

module.exports = {
	
	find: function (req, res) {

		if(!req.session.started) {
			req.session.started = TimestampService.unix();
		}

		var data = {
			recaptchaKey: Globals.recaptchaKey
		};

		res.view('distribution', data);
	}
};