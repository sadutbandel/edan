/**
* Cache.js
*
* Schemaless model responsible for caching RPC data that is commonly requested.
*/

module.exports = {

	autoCreatedAt: false,
	autoUpdatedAt: false,
	schema: false,

	attributes: {

	},

	/**
	 * Fetches any cached item we need from our Cache collection
	 */
	fetch: function(entry, callback) {

		Cache.native(function(err, collection) {
			if (!err){

				collection.find({ entry: entry }).limit(1).sort({ '$natural': -1 }).toArray(function (err, results) {
					if (!err) {
						callback(null, results);
					} else {
						callback(err, null);
					}
				});
			} else {
				callback(err, null);
			}
		});
	}
};