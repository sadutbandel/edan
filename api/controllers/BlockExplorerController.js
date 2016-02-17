/**
 * BlockExplorerController
 *
 * @description :: Server-side logic for managing blockexplorers
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	create: function(req, res) {

		console.log(Timestamp.utc() + ' retrieving block ' + req.body.hash);

		RetrieveBlockService.init(req.body.hash, function(err, resp) {

			console.log(Timestamp.utc() + ' retrieve block responded');

			if(!err) {
				console.log(Timestamp.utc() + ' retrieve block success');
				res.send(resp);
			} else {
				console.log(Timestamp.utc() + ' retrieve block error');
				console.log(err);
				res.send(err);
			}
		});
	}
	
};