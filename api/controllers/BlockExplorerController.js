/**
 * BlockExplorerController
 *
 * @description :: Server-side logic for managing blockexplorers
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	create: function(req, res) {

		RetrieveBlockService.init(req.body.hash, function(err, resp) {

			if(!err) {
				console.log(TimestampService.utc() + ' [BlockExplorerController.js] (!err) retrieving block... ' + JSON.stringify(resp));
				res.send(resp);
			} else {
				console.log(TimestampService.utc() + ' [BlockExplorerController.js] (err) retrieving block... ' + JSON.stringify(err));
				res.send(err);
			}
		});
	}	
};