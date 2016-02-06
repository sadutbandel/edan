/**
* PaymentDemo.js
*
* @description :: Our logic for the payment demo
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

	existing: function(account, callback) {

		console.log('Existing payment account is waiting ' + account);

		PaymentWaitService.init(account, function(err, res) {
			if(!err) {
				callback(null, res);
			} else {
				callback(err, null);
			}
		});
	},

	new: function(callback) {

		console.log('Creating a new payment account');

		PaymentBeginService.init(function(err, res) {
			if(!err) {
				callback(null, res);
			} else {
				callback(err, null);
			}
		});
	},

	recapture: function(account, callback) {

		console.log('Recapturing the funds used in the demo ' + account);

		PaymentRecaptureService.init(account, function(err, res) {

			if(!err) {
				callback(null, res);
			} else {
				callback(err, null);
			}
		});
	},

	end: function(account, callback) {

		console.log('Ending payment account ' + account);

		PaymentEndService.init(account, function(err, res) {
			if(!err) {
				callback(null, res);
			} else {
				callback(err, null);
			}
		});
	}
};