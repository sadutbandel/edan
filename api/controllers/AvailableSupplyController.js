/**
 * AvailableSupplyController
 *
 * @description :: Server-side logic for managing Availablesupplies
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	
	fetch: function (req, res) {

		ConvertedMraiFromRawService.fetch(function(err, resp) {

			console.log(Timestamp.utc() + ' converted mrai responded');

			if(!err) {

				console.log(Timestamp.utc() + ' converted mrai 200 response code');
				console.log(Timestamp.utc() + ' ' + resp.response.amount + 'is available in the supply');
				res.send(resp.response.amount);

			} else {
				console.log(Timestamp.utc() + ' converted mrai non-200 response code');
				res.send(err);
			}
		});
	}
};

