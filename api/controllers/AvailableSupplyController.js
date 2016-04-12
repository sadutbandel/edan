/**
 * AvailableSupplyController.js
 *
 * @description :: Fetch the available Raiblocks supply and conver the raw number to a human-readable one.
 */

module.exports = {
	
	// override the GET/fetch route/action
	fetch: function (req, res) {

		AvailableSupplyService.fetch(function(err, resp) {

			if(!err) {
				res.send(resp);
			} else {
				console.log(TimestampService.utc() + ' [AvailableSupplyController.js] (err) Total MRAI ' + JSON.stringify(err));
				res.send(err);
			}
		});
	}
};

