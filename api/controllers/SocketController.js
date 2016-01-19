/**
 * SocketController
 *
 * @description :: Server-side logic for managing sockets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	
	// return a socketID
	getSocketID: function(req, res) {
		if (!req.isSocket) return res.badRequest();

	 	var socketId = sails.sockets.id(req.socket);
  		// => "BetX2G-2889Bg22xi-jy"

  		return res.ok('My socket ID is: ' + socketId);
	}

};

