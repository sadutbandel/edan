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

   // PROCESS TOTALS
   /*
   AutomationService.processTotals(function(err, resp) {
      if(!err) {
         console.log(TimestampService.utc() + ' [ AutomationService.processTotals() ] (!err) ' + JSON.stringify(resp));
      } else {
         console.log(TimestampService.utc() + ' [ AutomationService.processTotals() ] (err) ' + JSON.stringify(err));
      }
   });
   */
  
   // PROCESS PAYOUTS
   /*
   AutomationService.processPayouts(function(err, resp) {
      if(!err) {
         console.log(TimestampService.utc() + ' [ AutomationService.processPayouts() ] (!err) ' + JSON.stringify(resp));
      } else {
         console.log(TimestampService.utc() + ' [ AutomationService.processPayouts() ] (err) ' + JSON.stringify(err));
      }
   });
   */
  
   // allows us to retrieve the remote-client IP and not localhost
   sails.hooks.http.app.set('trust proxy', true);

   // payment wallet is different for dev and prod
   // dev env
   if(sails.config.port === 1337) {
      sails.config.wallet = Globals.paymentWallets.development;
   } 
   // prod env
   else if(sails.config.port === 1338) {
      sails.config.wallet = Globals.paymentWallets.production;
   }

   // payment_init rpc
   PaymentInitService.init(function(err, resp) {
      if(!err) {
         //console.log(TimestampService.utc() + ' [Bootstrap.js] (!err) RPC payment_init ' + JSON.stringify(resp));
      } else {
         console.log(TimestampService.utc() + ' [Bootstrap.js] (err) RPC payment_init ' + JSON.stringify(err));
      }
   });
   
   // It's very important to trigger this callback method when you are finished
   // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
   cb();
};