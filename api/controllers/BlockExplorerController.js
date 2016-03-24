/**
 * BlockExplorerController
 *
 * @description :: Server-side logic for managing blockexplorers
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	create: function(req, res) {

		console.log(TimestampService.utc() + ' retrieving block ' + req.body.hash);

		RetrieveBlockService.init(req.body.hash, function(err, resp) {

			console.log(TimestampService.utc() + ' retrieve block responded');

			if(!err) {
				console.log(TimestampService.utc() + ' retrieve block success');
				res.send(resp);
			} else {
				console.log(TimestampService.utc() + ' retrieve block error');
				console.log(err);
				res.send(err);
			}
		});
	}
	
};