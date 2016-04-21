/**
* AutomationService.js
*
* @description :: Handles various automated tasks such as:
*                      Fixing stuck 'pending' distribution records.
*                      Loading the available supply, used after distribution succeeds.
*                      Processing distribution by looping through accounts requiring payouts.
*                      Load a new payout schedule when directed by bootstrap.js.
*/

module.exports = {

    // fix any stuck pending records causing perpetual 'Try Again' responses in faucet
    fixStuckPending: function(callback) {

        // iterate over our response of distribution records that may be stuck 'pending'
        loopStuckPending = function(response) {

            // as long as there are still elements in the array....
            if(response.length > 0) {

                // always use 0 since we're going to remove it from the array when we're done.
                var key = 0;

                // Update their stuck 'pending' record as 'violation' so they can continue with requests
                Distribution.update({ 
                    id: response[key].id
                }, {
                    modified : TimestampService.unix(),
                    account: response[key].account,
                    ip: response[key].account,
                    sessionID: response[key].account,
                    status: 'violation',
                    createdAt: response[key].createdAt,
                    updatedAt: response[key].updatedAt
                }).exec(function (er, upd){
                    if (!er) {

                        console.log('Fixing stuck record...');
                        console.log(JSON.stringify(upd[0]));

                        // remove the 1st element object from the array.
                        response.splice(0,1);

                        //tail-call recursion
                        loopStuckPending(response);

                    } else {
                        callback(er, null); // distribution update failure
                    }
                });
            } else {
                callback(null, true); // completed fixing stuck records
            }
        };

        // start finding expired pending records (over 1 minute old)
        Distribution.find({ status: "pending", modified: { "$lte": TimestampService.unix() - 60 }}, function(error, response) {
            if(!error) {
                loopStuckPending(response); // start tailcall recursion
            } else {
                callback(error, null); // no results found
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
                    raw_krai: resp
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

    // finalize totals for the last period, then process payouts to all totals records with "0" block hashes.
    // block hashes that are empty are for the CURRENT PERIOD, and can never get paid out on.
    processDistribution: function(callback) {

        // iterate over our response of accounts needing payment
        loopPayouts = function(resp) {

            // as long as there are still elements in the array....
            if(resp.length > 0) {

                // always use 0 since we're going to remove it from the array when we're done.
                var key = 0;

                console.log({
                    amount: resp[key].raw_rai_owed,
                    wallet: Globals.paymentWallets.production,
                    source: Globals.faucetAddress,
                    destination: resp[key].account
                });

                SendRaiService.send({
                    amount: '1000000000000000000000000000',
                    wallet: Globals.paymentWallets.production,
                    source: Globals.faucetAddress,
                    destination: resp[key].account
                }, function(err, res) {

                    if (!err) {

                        // SAVE BLOCK HASH RECEIPT in totals row 
                        // We must REBUILD the record properties or else the other properties will be lost.
                        Totals.update({ 
                            id: resp[key].id
                        }, {
                            paid_unix : TimestampService.unix(),
                            receipt_hash : res.response.block,
                            account: resp[key].account,
                            total_count: resp[key].total_count,
                            started_unix: resp[key].started_unix,
                            ended_unix: resp[key].ended_unix,
                            percentage_owed: resp[key].percentage_owed,
                            krai_owed: resp[key].krai_owed,
                            raw_rai_owed: resp[key].raw_rai_owed,
                            createdAt: resp[key].createdAt,
                            updatedAt: resp[key].updatedAt
                        }).exec(function (err, updated){
                            if (!err) {

                                console.log('Updating receipt hash...');
                                console.log(JSON.stringify(updated[0]));

                                // remove the 1st element object from the array.
                                resp.splice(0,1);

                                //tail-call recursion
                                //loopPayouts(resp);

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

        console.log('FINALIZING CALCULATIONS');

        DistributionTracker.last(function(err, resp) {
            
            if(!err) {

                // match only 'accepted' records that were in the last distribution timeframe (historical data)
                var match = {

                    '$and': [
                        {
                            modified : { 
                                '$lt': resp.lastHour
                            }
                        },
                        {
                            modified : { 
                                '$gte': resp.lastRan
                            }
                        },
                        { 
                            status: 'accepted'
                        },
                    ]
                };

                // count 'success' records and group by account.
                var group = {
                    _id: '$account',
                    count: { 
                        '$sum': 1
                    }
                };

                Distribution.native(function(err, collection) {
                    if (!err){

                        collection.aggregate([{ '$match' : match }, { '$group' : group }]).toArray(function (err, results) {
                            if (!err) {

                                /**
                                 * No matches found. (bad) HALT request!
                                 * 
                                 * If NO matches are found, then there are no Distribution records yet.
                                 */
                                
                                if(Object.keys(results).length === 0) {
                                    callback(true, null);
                                }
                                /**
                                 * Matches found. (good) CONTINUE request!
                                 * 
                                 * If matches ARE found, then we should get a list of accounts with counts.
                                 */
                                else {

                                    var accountsCount = 0,
                                    recordsCount = 0,
                                    records = [];

                                    for(key in results) {

                                        var payload = {
                                            paid_unix: 0, // filled upon payout.
                                            receipt_hash: 0, // filled upon payout. explicitly set to 0 now, indicating payout is possible.
                                            account: results[key]._id,
                                            total_count: results[key].count,
                                            started_unix: resp.lastRan,
                                            ended_unix: resp.lastHour // this is the last hour since we're doing historical (cron)
                                        };

                                        accountsCount++;
                                        records.push(payload);
                                        recordsCount += payload.total_count;
                                    }

                                    var payload = {
                                        started_unix: resp.lastRan,
                                        ended_unix: 0,
                                        accounts: accountsCount,
                                        successes: recordsCount,
                                        complete: false
                                    };

                                    DistributionTracker.update(payload, function(err, resp) {
                                        if(!err) {
                                            callback(null, resp); // looping complete and distribution tracker updated
                                        } else {
                                            callback(err, null);
                                        }
                                    });
                           
                                    /**
                                     * Find any totals records where they are not paid yet (no receipt_hash)
                                     * This specifically excludes records where the receipt_hash === "" because
                                     * this indicates a realtime record.
                                     */
                                    Totals.find({ receipt_hash: "" }, function(err, resp) {
                                    //Totals.find({ receipt_hash: 0 }, function(err, resp) { 
                                        
                                        if(!err) {
                                            // start the loop the first time.
                                            loopPayouts(resp);
                                        } else {
                                            console.log(JSON.stringify(err));
                                        }
                                    });
                                }
                            } else {
                                callback({ error: err }, null);
                            }
                        });
                    } else {
                        callback({ error: err }, null);
                    }
                });
            } else {
                callback({ error: err }, null);
            }
        });   
    },

    // enter the desired payout amount per day here
    loadPayoutSchedule: function(callback) {

        var payload = {
            created_unix: TimestampService.unix(),
            hourly_rai: '21000000000000000000000000000000000' // 21,000,000/hr
        };

        PayoutSchedule.create(payload, function(err, resp) {
            
            // processed
            if(!err) {
                console.log(JSON.stringify(resp));
            } else { // not processed
                console.log(JSON.stringify(err));
            }
        });
    }
};