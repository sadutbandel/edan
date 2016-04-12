/**
 * BlockExplorerController
 *
 * @description :: Allow exploration of blocks and eventually accounts and more.
 */

module.exports = {

	// override the POST/create route/action
	create: function(req, res) {

		RetrieveBlockService.init(req.body.hash, function(err, resp) {

			if(!err) {
				res.send(resp);
			} else {
				console.log(TimestampService.utc() + ' [BlockExplorerController.js] (err) retrieving block... ' + JSON.stringify(err));
				res.send(err);
			}
		});
	}	
};