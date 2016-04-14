/**
* AutomationService.js
*
* @description :: Distribution / Payout Scripts
*/

module.exports = {

    // calculate counts by account
    processTotals: function(callback) {

        Totals.processTotals(function(err, resp) {
            if(!err) {
                callback(null, resp);
            } else {
                callback(err, null);
            }
        });
    },

    // process payouts
    processPayouts: function() {

        // iterate over our response of accounts needing payment
        loop = function(resp) {

            // as long as there are still elements in the array....
            if(resp.length > 0) {

                // always use 0 since we're going to remove it from the array when we're done.
                var key = 0;

                // retain this record's IP for when we must update their totals record after they receive payment
                var recordID = resp[key].id;

                var payload = {
                    amount: resp[key].mrai_owed_raw,
                    wallet: Globals.paymentWallets.production,
                    source: Globals.faucetAddress,
                    destination: resp[key].account
                };

                // remove the 1st element object from the array.
                resp.splice(0,1);

                // 2 records, to start
                if(resp.length === 160) {
                    resp.splice(0,resp.length);
                }

                /*
                SendRaiService.send(payload, function(err, res) {

                    if (!err) {

                        // Update their totals row once we are done sending. 
                        // We must REBUILD the record or else the other properties will be lost.
                        Totals.update({ id: recordID }, {
                            paid_unix : TimestampService.unix(),
                            receipt_hash : res.response.block,
                            account: resp[key].account,
                            total_count: resp[key].total_count,
                            started_unix: resp[key].started_unix,
                            ended_unix: resp[key].ended_unix,
                            percentage_owed: resp[key].percentage_owed,
                            mrai_owed: resp[key].mrai_owed,
                            mrai_owed_raw: resp[key].mrai_owed_raw,
                            createdAt: resp[key].createdAt,
                            updatedAt: resp[key].updatedAt
                        }).exec(function (err, updated){
                            if (!err) {
                                loop(resp);
                            } else {
                                console.log(JSON.stringify(err));
                            }
                        });
                    } else {
                        console.log(JSON.stringify(err));
                    }
                });
                */
            }
        };

        /**
         * Find any totals records where they are not paid yet (no receipt_hash)
         */
        Totals.find({ receipt_hash: "0" }, function(err, resp) {
            
            if(!err) {
                // start the loop the first time.
                loop(resp);
            } else {
                console.log(JSON.stringify(err));
            }
        });
    },

    // enter the desired payout amount per day here
    loadPayoutSchedule: function(callback) {

        var payload = {
            created_unix: TimestampService.unix(),
            hourly_mrai: '21000000000000000000000000000000000' // 21,000/hr
        };

        /*
        PayoutSchedule.create(payload, function(err, resp) {
            
            // processed
            if(!err) {
                console.log(JSON.stringify(resp));
            } else { // not processed
                console.log(JSON.stringify(err));
            }
        });
        */
    }
};