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

   // enter the desired payout amount per day here
   loadPayoutSchedule = function() {

      var payload = {
         created_unix: TimestampService.unix(),
         hourly_mrai: '21000000000000000000000000000000000' // 21,000/hr
      };

      PayoutSchedule.create(payload, function(err, resp) {
            
         // processed
         if(!err) {
            console.log(JSON.stringify(resp));

         } else { // not processed
            console.log(JSON.stringify(err));
         }
      });
   };
   //loadPayoutSchedule();

   // load the Distribution table with dummy data.
   // a specific amount of accounts receives a random amount of counts.
   // each account has a 50% chance of having a 2nd IP.
   loadDistribution = function() {

      // things we are storing
      var things = ['accounts', 'ips', 'sessions'];

      // timeframe to generate records in GMT
      var start = 1460505600; 
      var end = 1460592000; 

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

      // generate 1000 random accounts, sessions, and ips.
      // realistically we'd have more IPs and what not, but
      // this test is purely for counting / calculating payouts
      var amount = 1000;

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
            modified: randNum(start, end)
         },function(err, resp){if(!err){}else {}});
      }     
   };
   //loadDistribution();

   // calculate counts by account
   processTotals = function() {
      Totals.processTotals(function(err, resp) {
            
         if(!err) {
            console.log('processTotals success');
            console.log(JSON.stringify(resp));
         } else {
            console.log('processTotals error');
            console.log(JSON.stringify(err));
         }
      });
   };
   //processTotals();

   // process payouts
   // 
   processPayouts = function() {

      /**
       * Find any totals records where they are not paid yet (no receipt_hash)
       */
      Totals.find({ receipt_hash: "0" }, function(err, resp) {
            
         // processed
         if(!err) {

            console.log('resp');
            console.log(resp);

            /**
             * Iterate through all the non-paid records results and create a payload to send them mrai
             */
            for(key in resp) {

               // retain this record's IP for when we must update their totals record after they receive payment
               var recordID = resp[key].id;

               console.log('recordID');
               console.log(recordID);

               var payload = {
                  amount: resp[key].mrai_owed_raw,
                  wallet: sails.config.wallet,
                  source: Globals.faucetAddress,
                  destination: resp[key].account
               };

               /*
               SendRaiService.send(payload, function(err, resp) {

                  if (!err) {

                     // Update this totals record after we verify the send has completed.
                     var payload = {
                        paid_unix : TimestampService.unix(),
                        receipt_hash : testResp.hash,
                     };

                     Totals.update({ id: recordID }, payload).exec(function (err, updated){
                        if (!err) {
                           console.log(updated[0]);
                        } else {
                           console.log(err);
                        }
                     });
                  }// end dummy resp
                  else {
                     console.log(JSON.stringify(err));
                  }
               });
               */
            }// end FOR loop
         } else { // not processed
            console.log(JSON.stringify(err));
         }
      });
   }
   //processPayouts();

   // load the distribution tracker with a starting point for our first time running
   // otherwise first time calcs will not work properly.
   loadDistributionTracker = function() {

      var payload = {
         created_unix: TimestampService.unix(),
         started_unix: 0,
         ended_unix: 1460570400, // change to 1460570400 (11am PST) in prod.
         accounts: 0,
         successes: 0
      };

      DistributionTracker.create(payload,function(err, resp){if(!err){}else {}});
   }
   //loadDistributionTracker();

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