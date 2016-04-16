/**
* AutomationService.js
*
* @description :: Distribution / Payout Scripts
*/

module.exports = {

    // fix any stuck pending records causing perpetual 'Try Again' responses in faucet
    fixStuckPending: function(callback) {

        // iterate over our response of distribution records that may be stuck 'pending'
        loop = function(resp) {

            // as long as there are still elements in the array....
            if(resp.length > 0) {

                // always use 0 since we're going to remove it from the array when we're done.
                var key = 0,

                // retain this record's ID for when we must update their record
                recordID = resp[key].id,

                where = { 
                    id: recordID
                },

                payload = {
                    modified : TimestampService.unix(),
                    account: resp[key].account,
                    ip: resp[key].account,
                    sessionID: resp[key].account,
                    status: 'violation',
                    createdAt: resp[key].createdAt,
                    updatedAt: resp[key].updatedAt
                };

                // Update their stuck 'pending' record as 'violation' so they can continue with requests
                Distribution.update(where, payload).exec(function (err, updated){
                    if (!err) {

                        console.log(JSON.stringify(updated[0]));

                        // remove the 1st element object from the array.
                        resp.splice(0,1);

                        //tail-call recursion
                        loop(resp);

                    } else {
                        callback(err, null); // distribution update failure
                    }
                });
            } else {
                callback(null, true); // completed fixing stuck records
            }
        };

        var minAgo = TimestampService.unix() - 60;

        // start finding expired pending records (over 1 minute old)
        Distribution.find({ status: "pending", modified: { "$lte": minAgo }}, function(err, resp) {
            if(!err) {
                loop(resp); // start tailcall recursion
            } else {
                callback(err, null); // no results found
            }
        });
    },

    // fetch & load the available supply from the RPC into mongo
    loadAvailableSupply: function(callback) {

        AvailableSupplyService.fetch(function(err, resp) {
            if(!err) {
                
                // add a new entry for available supply
                AvailableSupply.create({
                    modified: TimestampService.unix(),
                    amount: resp
                }, function(err, resp) {
                    if(!err) {
                        callback(null, resp);
                    } else {
                        callback(err, null);
                    }
                });
            } else {
                callback(err, null);
            }
        });
    },

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
    processPayouts: function(callback) {

        // iterate over our response of accounts needing payment
        loop = function(resp) {

            // as long as there are still elements in the array....
            if(resp.length > 0) {

                // always use 0 since we're going to remove it from the array when we're done.
                var key = 0;

                // retain this record's ID for when we must update their totals record after they receive payment
                var recordID = resp[key].id;

                var payload = {
                    amount: resp[key].mrai_owed_raw,
                    wallet: Globals.paymentWallets.production,
                    source: Globals.faucetAddress,
                    destination: resp[key].account
                };

                SendRaiService.send(payload, function(err, res) {

                    if (!err) {

                        var where = { 
                            id: recordID
                        };

                        var payload = {
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
                        };

                        // Update their totals row once we are done sending. 
                        // We must REBUILD the record or else the other properties will be lost.
                        Totals.update(where, payload).exec(function (err, updated){
                            if (!err) {

                                console.log(JSON.stringify(updated[0]));

                                // remove the 1st element object from the array.
                                resp.splice(0,1);

                                //tail-call recursion
                                loop(resp);

                            } else {
                                console.log(JSON.stringify(err));
                                callback(err, null); // totals update failure
                            }
                        });
                    } else {
                        console.log(JSON.stringify(err));
                        callback(err, null); // send rai failure
                    }
                });
            } else {
                callback(null, true); // completed!
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