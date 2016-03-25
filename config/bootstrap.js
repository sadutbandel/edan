/**
* Bootstrap
* (sails.config.bootstrap)
*
* An asynchronous bootstrap function that runs before your Sails app gets lifted.
* This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
*
* For more information on bootstrapping your app, check out:
* http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.bootstrap.html
*/

module.exports.bootstrap = function(cb) {

   // allows us to retrieve the client IP
   sails.hooks.http.app.set('trust proxy', true);

   // I need to resolve an issue with minification before I can use the built-in prod/env flag
   // dev env
   if(sails.config.port === 1337) {
      sails.config.wallet = Globals.paymentWallets.development;
   } 
   // prod env
   else if(sails.config.port === 1338) {
      sails.config.wallet = Globals.paymentWallets.production;
   }

   PaymentInitService.init(function(err, resp) {
      console.log(TimestampService.utc() + ' Payment_init');
      if(!err) {
         console.log(TimestampService.utc() + ' ' + JSON.stringify(resp));
      } else {
         console.log(TimestampService.utc() + ' ' + JSON.stringify(err));
      }
   });

   //sails.hooks.http.app.set('trust proxy', true);
   
   // It's very important to trigger this callback method when you are finished
   // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
   cb();
};
