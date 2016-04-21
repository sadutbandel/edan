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

   // PROCESS DISTRIBUTION if automation fails
   /*
   AutomationService.processDistribution(function(err, resp) {
      if(!err) {

         console.log(TimestampService.utc() + ' [ AutomationService.processDistribution() ] (!err) ' + JSON.stringify(resp));
         
         // LOAD AVAILABLE SUPPLY
         AutomationService.loadAvailableSupply(function(err, resp) {
            if(!err) {
               console.log(TimestampService.utc() + ' [ AutomationService.loadAvailableSupply() ] (!err) ' + JSON.stringify(resp));
            } else {
               console.log(TimestampService.utc() + ' [ AutomationService.loadAvailableSupply() ] (err) ' + JSON.stringify(err));
            }
         }); 
      } else {
         console.log(TimestampService.utc() + ' [ AutomationService.processDistribution() ] (err) ' + JSON.stringify(err));
      }
   });
   */

   /*Load a new payout schedule
   
   AutomationService.loadPayoutSchedule(function(err, resp) {
      if(!err) {
         console.log('New payout schedule loaded');
      } else {
         console.log('Error loading payout schedule');
      }
   });
   */

   /* Past Distributions marked for completion
   DistributionTracker.find(function(err, resp) {
      if(!err) {

         console.log('Past distributions loaded');

         for(key in resp) {

            resp[key].distribution_complete = true;

            DistributionTracker.native(function(err, collection) {
               if (!err) {

                  collection.update({ ended_unix: resp[key].ended_unix }, resp[key], { upsert: true }, function (err, updated) {
                     if (!err) {
                        console.log(updated);
                     } else {
                        console.log(err);
                     }
                  });
               } else {
                  console.log('Past Distributions update failed');
               }
            });
         }
      } else {
         console.log('Error loading past distributions');
      }
   });
   */
  
   /* Update Available Supply numbers to be integers and all KRAI
   AvailableSupply.find(function(err, resp) {
      if(!err) {
         
         console.log('AvailableSupply loaded');

         for(key in resp) {

            if(resp[key].raw_krai <= 16625704) {
               resp[key].raw_krai = resp[key].raw_krai * 1000;
            }

            resp[key].raw_krai.toString();

            AvailableSupply.native(function(err, collection) {
               if (!err) {

                  collection.update({ modified: resp[key].modified }, resp[key], { upsert: true }, function (err, updated) {
                     if (!err) {
                        console.log(updated);
                     } else {
                        console.log(err);
                     }
                  });
               } else {
                  console.log('AvailableSupply update failed');
               }
            });
         }
      } else {
         console.log('AvailableSupply error');
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