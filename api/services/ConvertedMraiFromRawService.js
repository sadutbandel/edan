/**
 * Converts raw Mrai into a human-readable form.
 * Used in AvailableSupplyController.js as well as any other Controller that needs it
 */

module.exports = {

	fetch: function(callback) {

		AvailableSupplyService.fetch(function(err, resp) {

			console.log(Timestamp.utc() + ' available_supply responded');

			if(!err) {

				console.log(Timestamp.utc() + ' available_supply 200 response code');
					
				// convert raw mrai to human-readable
				MraiFromRawService.convert(resp.response.available, function(err, resp) {

					if(!err) {
						console.log(Timestamp.utc() + ' mrai from raw 200 response code');
						callback(resp.response.amount, null);
					} else {
						console.log(Timestamp.utc() + ' mrai from raw non-200 response code');
						callback(null, err);
					}
				});

			} else {
				console.log(Timestamp.utc() + ' available_supply non-200 response code');
				callback(null, err);
			}
		});
	}
};