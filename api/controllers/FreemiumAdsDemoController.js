/**
 * DemosController
 *
 * @description :: 
 */

module.exports = {
	
	find: function (req, res) {

		if(!req.session.started) {
			req.session.started = TimestampService.unix();
		}

		res.view('freemium-ads-demo');
	}
};