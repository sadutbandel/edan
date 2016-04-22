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

    // First, run finalizeCalculations() to finalize totals for the last non-finalized, unpaid period.
    // Second, run processPayouts() to find all records with "" block hashes.
    // Third, run loopPayouts using those accounts to distribute to each Totals record needing it.
    processDistribution: function(callback) {

        /**
         * First, Find the last distribution period that has not be finalized yet (or obviously paid yet)
         * Second, calculate total accounts, successes for all accounts for the period
         * Third, save those totals for the period and mark the distribution period as 'finalized' but not 'paid'
         * Fourth, move to processPayouts().
         */
        finalizeCalculations = function() {

            console.log('---------------- FINALIZING CALCULATIONS ----------------');

            DistributionTracker.last({ finalized: false, paid: false }, function(err, resp) {
                
                if(!err) {

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
                                        callback('no matches', null);
                                    }

                                    /**
                                     * Matches found. (good) CONTINUE request!
                                     * 
                                     * If matches ARE found, then we should get a list of accounts with counts.
                                     * Count total accounts and records for storage in in DistributionTracker
                                     */
                                    else {

                                        var accountsCount = 0,
                                        recordsCount = 0;

                                        for(key in results) {
                                            accountsCount++;
                                            recordsCount += results[key].count;
                                        }

                                        // create a DistributionTracker payload
                                        // mark this period as Finalized!
                                        // mark this period as NOT paid yet...
                                        var payload = {
                                            started_unix: resp.lastRan,
                                            ended_unix: resp.lastHour,
                                            accounts: accountsCount,
                                            successes: recordsCount,
                                            finalized: true,
                                            paid: false
                                        };

                                        DistributionTracker.update(payload, function(err, resp) {
                                            console.log('---------------- CALCULATIONS FINALIZED ----------------');
                                            // once calculations are finalized, they won't ever be finalized again,
                                            // nor should they need to be. payouts process can fail now like if RPC
                                            // gets overloaded, and we can simply re-run it without worrying about
                                            // any calculations needing to be finalized.
                                            processPayouts();
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
        };

        finalizeCalculations();

        // iterate over accounts needing payment
        loopPayouts = function(resp) {

            // as long as there are still elements in the array....
            if(resp.length > 0) {

                // always use 0 since we're going to remove it from the array when we're done.
                var key = 0;
                
                var sendRaiPayload = {
                    amount: '1000000000000000000000000000',
                    //amount: resp[key].raw_rai_owed,
                    wallet: Globals.paymentWallets.production,
                    source: Globals.faucetAddress,
                    destination: resp[key].account
                };

                SendRaiService.send(sendRaiPayload, function(err, res) {

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
                            raw_rai_owed: resp[key].raw_rai_owed
                        }).exec(function (err, updated){
                            if (!err) {

                                console.log('Updating receipt hash...');
                                console.log(JSON.stringify(updated[0]));

                                // remove the 1st element object from the array.
                                resp.splice(0,1);

                                //tail-call recursion
                                loopPayouts(resp);

                            } else {
                                callback(err, null); // totals update failure
                            }
                        });
                    } else {
                        callback(err, null); // send rai failure
                    }
                });
            } else {

                // mark DT as paid
                callback(null, true); // completed!
            }
        };

        /**
         * This function needs to work retroactively in case 1 or more distributions are missed.
         * We will simply grab all empty receipt hashes and then using the started_unix time of
         * each record, we will know which distribution period the record falls within.
         * 
         * First, search for all totals records were the receipt hash is empty and 
         * @return {[type]} [description]
         */
        processPayouts = function(started_unix) {

            var where = { receipt_hash: "" };

            Totals.find(where, function(err, resp) { 
                
                if(!err) {
                    // start the loop the first time.
                    loopPayouts(resp);
                } else {
                    callback({ error: err }, null);
                }
            });
        };
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