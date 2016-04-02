/**
 * Converts raw Mrai into a human-readable form.
 * Used in AvailableSupplyController.js as well as any other Controller that needs it
 */

module.exports = {

	fetch: function(callback) {

		AvailableSupplyService.fetch(function(err, resp) {

			if(!err) {

				//console.log(TimestampService.utc() + ' [ConvertedMraiFromRawService.js] (!err) ' + JSON.stringify(resp));

				// convert raw mrai to human-readable
				MraiFromRawService.convert(resp.response.available, function(err, resp) {

					if(!err) {
						//console.log(TimestampService.utc() + ' [ConvertedMraiFromRawService.js] (!err) ' + JSON.stringify(resp));
						callback(null, resp.response.amount);
					} else {
						//console.log(TimestampService.utc() + ' [ConvertedMraiFromRawService.js] (errs) ' + JSON.stringify(err));
						callback(err, null);
					}
				});

			} else {
				//console.log(TimestampService.utc() + ' [ConvertedMraiFromRawService.js] (err) ' + JSON.stringify(err));
				callback(err, null);
			}
		});
	}
};