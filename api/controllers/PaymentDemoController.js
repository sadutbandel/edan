/**
 * PaymentDemoController
 *
 * @description :: 
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	create: function(req, res) {

		// fetch the end-user's unique websocket id
		socketId = sails.sockets.id(req.socket);

		// an existing payment account exists in the user's session
		if(req.session.payment) {

			var account = req.session.payment.account;

			// send the payment account to the user
			console.log('Emitting \'account\' = ' + account + ' via existing');
			sails.sockets.emit( socketId, 'account', account );

			// pass the payment account from session to our payment_wait long-polling listener function
			PaymentDemoService.waitPayment(account,function(err, resp) {

				if(!err) {
					
					// emit a 'paid' event to the front-end user
					console.log('Emitting \'paid\' === ' + resp.paid);
					sails.sockets.emit(socketId, 'paid', resp.paid);
					res.send(resp);

				} else {
					//console.log(err);
					res.send(err);
				}
			});
		}

		// new payment demo
		else {

			PaymentDemo.new(function(err, resp) {

				if(!err) {

					var account = resp.account;

					// send the payment account to the user
					console.log('Emitting \'account\' = ' + account + ' via new');
					sails.sockets.emit( socketId, 'account', account );

					// create our session payment object
					req.session.payment = {};

					// store the account retrieved from the payment demo
					req.session.payment.account = account;

					// begin wait payment
					PaymentDemoService.waitPayment(account,function(err, resp) {

						if(!err) {

							// clear the session 
							if(resp.statusCode === 200) {

								console.log('Clearing payment account from session');
								req.session.payment = undefined;

								// emit a 'paid' event to the front-end user
								console.log('Emitting \'paid\' === ' + resp.paid);
								sails.sockets.emit(socketId, 'paid', resp.paid);
							}
							res.send(resp);
						} else {
							//console.log(err);
							res.send(err);
						}
					});

				} else {
					//console.log(err);
					res.send(err);
				}
			});
		}
	}
};