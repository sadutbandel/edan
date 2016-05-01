/**
 * CacheController.js
 *
 * @description :: Fetch anything cached in MongoDB
 */

module.exports = {
	
	available_supply: function (req, res) {

		Cache.fetch('available_supply', function(err, resp) {
			if(!err) {
				// converts raw_krai to string
				res.send(resp[0].raw_krai.toString());
			} else {
				res.send(err);
			}
		});
	},

	block_count: function (req, res) {

		Cache.fetch('block_count', function(err, resp) {
			if(!err) {
				res.send(resp[0].count);
			} else {
				res.send(err);
			}
		});
	},
};

