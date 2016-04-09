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

   /*******************************
   ****** START SCRIPT TESTS ******
   *******************************/

   Totals.calculate(function(err, resp) {
         
      if(!err) {
         console.log(JSON.stringify(resp));

      } else {
         //console.log(JSON.stringify(err));
      }
   });

   // Load the TrackCounter collection with sample data.
   loadTrackCounter = function() {
      // Insert some test data to create mongo collection
      var payload = {
         //created_unix: TimestampService.unix(),
         created_unix: 1460219532, // 9:35am
         start_unix: 1460196000, // 3am
         end_unix: 1460217600, // 9am
         accounts: 149,
         successes: 2943
      };
      var payload = {
         //created_unix: TimestampService.unix(),
         created_unix: 1460160009, // 12:00:09am
         start_unix: 1460138400, // 6:00pm
         end_unix: 1460160000, // 12:00am
         accounts: 99,
         successes: 2231
      };

      TrackCounter.create(payload, function(err, resp) {
            
         // processed
         if(!err) {
            console.log(JSON.stringify(resp));

         } else { // not processed
            console.log(JSON.stringify(err));
         }
      });
   }
   //loadTrackCounter();
   
   /*****************************
   ****** END SCRIPT TESTS ******
   *****************************/

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