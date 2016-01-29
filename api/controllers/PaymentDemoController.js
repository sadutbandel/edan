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

		// if an existing payment account exists in the user's session
		if(req.session.payment) {

			var account = req.session.payment.account;

			// send the payment account to the user
			console.log('Emitting \'account\' = ' + account + ' via existing');
			sails.sockets.emit( socketId, 'account', account );

			// pass the payment account from session to our payment_wait long-polling listener function
			PaymentDemoService.waitPayment(account,function(err, resp) {

				if(!err) {

					// remove the payment account from session once we discover we've been paid
					if(resp.paid === true) {
						console.log('Clearing payment account from session');
						req.session.payment = undefined;
					}

					console.log('Returning \'paid\' === ' + resp.paid);

					res.send(resp);

				} else {
					//console.log(err);
					res.send(err);
				}
			});
		}

		// new payment demo
		else {

			// create a new payment account
			PaymentDemo.new(function(err, resp) {

				if(!err) {

					// retrieve newly created payment account
					var account = resp.account;

					// send the payment account to the user's front-end (demo.js)
					console.log('Emitting \'account\' = ' + account + ' via new');
					sails.sockets.emit( socketId, 'account', account );

					// create a session payment object
					req.session.payment = {};

					// store the account retrieved from the payment demo in this session payment object
					req.session.payment.account = account;

					// begin a wait payment
					PaymentDemoService.waitPayment(account,function(err, resp) {

						if(!err) {
							
							// clear the session 
							if(resp.paid === true) {

								// cler the payment account from the session
								console.log('Clearing payment account from session');
								req.session.payment = undefined;
							}

							console.log('Returning \'paid\' === ' + resp.paid);

							//console.log(resp);
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