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

   // load the Distribution table with dummy data.
   loadDistribution = function() {

      // prepare for storing record objects
      var records = [];

      // return a random number 0 to amt ( for ips )
      rand = function(amount) {
         return Math.floor((Math.random() * amount) + 0);
      }

      // create a fake ip
      buildIP = function(n) {
         return rand(n) + '.' + rand(n) + '.' + rand(n) + '.' + rand(n);
      }

      randomString = function(length) {
         return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
      }

      buildSession = function() {
         return randomString(30);
      }

      buildAccount = function() {
         return 'xrb_' + randomString(60);
      }

      buildStatus = function() {
         var status;
         if(rand(100)>=5) {
            status = 'accepted';
         } else {
            status = 'violation';
         }
         return status;
      }

      // generate records
      for(i = 1; i < 50; i++) {


         var obj = {
            account: buildAccount(),
            ip: buildIP(255),
            sessionID: buildSession(),
            status: buildStatus()
         }
         
         records.push(obj);
      }

      console.log(records);

   };loadDistribution();

   processTotals = function() {
      Totals.process(function(err, resp) {
            
         if(!err) {
            console.log('processTotals success')
            console.log(JSON.stringify(resp));
         } else {
            console.log('processTotals error')
            console.log(JSON.stringify(err));
         }
      });
   };//processTotals();

   // Load the TrackCounter collection with sample data.
   loadTrackCounter = function() {
      // Insert some test data to create mongo collection
      var payload = {
         created_unix: TimestampService.unix(),
         start_unix: 0, // 1st record ever would have 0 here.
         end_unix: 1460232000, // 1pm
         accounts: 149,
         successes: 2943
      };
      /*
      var payload = {
         //created_unix: TimestampService.unix(),
         created_unix: 1460160009, // 12:00:09am
         start_unix: 1460138400, // 6:00pm
         end_unix: 1460160000, // 12:00am
         accounts: 99,
         successes: 2231
      };
      */
      TrackCounter.create(payload, function(err, resp) {
            
         // processed
         if(!err) {
            console.log(JSON.stringify(resp));

         } else { // not processed
            console.log(JSON.stringify(err));
         }
      });
   };//loadTrackCounter();
      
   // (this is rarely done)
   loadPayoutSchedule = function() {

      var payload = {
         created_unix: TimestampService.unix(),
         total_mrai: '450000000000000000000000000000000000', //450k
         hour_interval: 6,
         expired: false
      };

      PayoutSchedule.create(payload, function(err, resp) {
            
         // processed
         if(!err) {
            console.log(JSON.stringify(resp));

         } else { // not processed
            console.log(JSON.stringify(err));
         }
      });
   };//loadPayoutSchedule();

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