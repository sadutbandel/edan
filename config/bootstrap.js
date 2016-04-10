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
   // a specific amount of accounts receives a random amount of counts.
   // each account has a 50% chance of having a 2nd IP.
   loadDistribution = function() {

      // things we are storing
      var things = ['accounts', 'ips', 'sessions'];

      /*
      Start Time:
      Human time (GMT): Sun, 10 Apr 2016 00:00:00 GMT
      Human time (your time zone): 4/9/2016, 5:00:00 PM
       */
      var start = 1460246400; 

      /*
      End Time:
      Human time (GMT): Mon, 11 Apr 2016 00:00:00 GMT
      Human time (your time zone): 4/10/2016, 5:00:00 PM
      */
      var end = 1460332800; 

      // things turn into arrays inside this object
      var arrays = {};
      for(key in things) {
         arrays[things[key]] = [];
      }

      // xrb_ prefixed accounts
      buildAccount = function() {
         return 'xrb_' + randomString(60);
      }

      // return a random between two amounts
      randNum = function(min, max) {
         return Math.floor(Math.random()*(max-min+1)+min);
         //return Math.floor((Math.random() * max) + min);
      }

      // create a fake ip
      buildIP = function(n) {
         return randNum(0,n) + '.' + randNum(0,n) + '.' + randNum(0,n) + '.' + randNum(0,n);
      }

      // random string based on length
      randomString = function(length) {
         return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
      }

      // random session string
      buildSession = function() {
         return randomString(30);
      }

      // 5% chance to be marked as a violation, 95% chance to be marked as accepted.
      buildStatus = function() {

         if(randNum(0,100)>5) {
            return 'accepted';
         } else {
            return 'violation';
         }
      }

      // pick a random array value
      randomArrVal = function(array) {
         return array[Math.floor(Math.random() * array.length)];
      }

      // generate 1500 random accounts, sessions, and ips.
      // realistically we'd have more IPs and what not, but
      // this test is purely for counting / calculating payouts
      var amount = 1500;

      for(i = 1; i < amount; i++) {
         arrays.accounts.push(buildAccount());
      }
      for(i = 1; i < amount; i++) {
         arrays.sessions.push(buildSession());
      }
      for(i = 1; i < amount; i++) {
         arrays.ips.push(buildIP(255));
      }

      // Generate distribution records by picking a random 
      // account, ip, and session values from our master
      // arrays created above. We use a random unix time
      // stamp for the modified time between the range shown
      // above.
      var records = 10000;
      for(i = 0; i < records; i++) {

         Distribution.create({
            account: randomArrVal(arrays.accounts),
            ip: randomArrVal(arrays.ips),
            sessionID: randomArrVal(arrays.sessions),
            status: buildStatus(),
            modified: randNum(start, end-1)
         },function(err, resp){if(!err){}else {}});
      }     
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