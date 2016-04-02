/**
 * AvailableSupplyController
 *
 * @description :: Server-side logic for managing Availablesupplies
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	
	fetch: function (req, res) {

		ConvertedMraiFromRawService.fetch(function(err, resp) {

			if(!err) {
				//console.log(TimestampService.utc() + ' [AvailableSupplyController.js] (!err) Total MRAI ' + JSON.stringify(resp));
				res.send(resp); // a raw amount integer, like 9013823
			} else {
				console.log(TimestampService.utc() + ' [AvailableSupplyController.js] (err) Total MRAI ' + JSON.stringify(err));
				res.send(err);
			}
		});
	}
};

