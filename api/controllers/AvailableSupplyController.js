/**
 * AvailableSupplyController.js
 *
 * @description :: Fetch the publicly available rai supply
 */

module.exports = {
	
	// override the GET/fetch route/action
	fetch: function (req, res) {

		AvailableSupply.native(function(err, collection) {
			if (!err){

				collection.find().limit(1).sort({ '$modified': 1 }).toArray(function (err, results) {
					if (!err) {
						var amount = results[0].raw_krai.toString();
						res.send(amount);
					} else {
						res.send(err);
					}
				});
			} else {
				res.send(err);
			}
		});
	}
};

