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

    // 'run' determines if we are finalizing & distributing, or just one or the other.
    // 
    // First, run finalizeCalculations() to finalize totals for the last unpaid period.
    // Second, run processPayouts() to find all records with "" block hashes.
    // Third, run loopPayouts using those found record's accounts to distribute to owed Krai to the Totals record needing it.
    processDistribution: function(run, callback) {

        var lastHour,
        lastRan;

        /**
         * First, Find the last distribution period that has not be finalized yet (or obviously been paid yet)
         * Second, calculate total accounts & total successes for all accounts during this period (last ran to last hour, this runs bi-hourly)
         * Third, save that  data for the period in DistributionTracker & mark the distribution period as 'finalized' but not 'paid'
         * Fourth, move to processPayouts().
         */
        finalizeCalculations = function() {

            console.log('---------------- FINALIZING CALCULATIONS ----------------');

            DistributionTracker.last({ finalized: false, paid: false }, function(err, resp) {
                
                if(!err) {

                    lastHour = resp.lastHour;
                    lastRan = resp.lastRan;

                    var match = {

                        '$and': [
                            {
                                modified : { 
                                    '$lt': lastHour
                                }
                            },
                            {
                                modified : { 
                                    '$gte': lastRan
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

                                        // count stuff
                                        // make sure to mark 0 ended_unix timestamps with their real distribution period ended times.
                                        for(key in results) {
                                            accountsCount++;
                                            results[key].ended_unix = lastHour;
                                            recordsCount += results[key].count;
                                        }

                                        // create a DistributionTracker payload
                                        // mark this period as Finalized!
                                        // mark this period as NOT paid yet...
                                        var payload = {
                                            created_unix: resp.created_unix,
                                            started_unix: resp.started_unix,
                                            ended_unix: lastHour,
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

        if(run === 'everything' || run === 'numbers') {
            finalizeCalculations();
        }

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

                        var where = { 
                            id: resp[key].id
                        };

                        var what = {
                            paid_unix : TimestampService.unix(),
                            receipt_hash : res.response.block,
                            account: resp[key].account,
                            total_count: resp[key].total_count,
                            started_unix: resp[key].started_unix,
                            ended_unix: resp[key].ended_unix,
                            percentage_owed: resp[key].percentage_owed,
                            krai_owed: resp[key].krai_owed,
                            raw_rai_owed: resp[key].raw_rai_owed
                        };

                        console.log('where');
                        console.log(where);

                        console.log('what');
                        console.log(what);

                        // SAVE BLOCK HASH RECEIPT in totals row 
                        // We must REBUILD the record properties or else the other properties will be lost.
                        Totals.update(where, what).exec(function (err, updated){
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

                console.log('WE SHOULD MARK DT FOR THIS PERIOD AS PAID ');
                // mark DT as paid...
                // 
                // 
                // 
                // 
                // 
                // 
                // 
                // 
                // 
                callback(null, true); // completed!
            }
        };

        // iterate over all totals records for each account with empty hash and update ended timestamps
        loopEnded = function(resp, objParams) {

            if(resp.length > 0) {

                var key = 0;

                var where = { 
                    id: resp[key].id
                };

                var what = {
                    paid_unix : resp[key].paid_unix,
                    receipt_hash : "", // we know it's an empty string, but we have to explicitly define it here, or else '' will be passed and cause failure of insertion.
                    account: resp[key].account,
                    total_count: resp[key].total_count,
                    started_unix: resp[key].started_unix,
                    ended_unix: objParams.lastHour,
                    percentage_owed: resp[key].percentage_owed,
                    krai_owed: resp[key].krai_owed,
                    raw_rai_owed: resp[key].raw_rai_owed
                };

                console.log('loopEnded what');
                console.log(what);

                // SAVE ENDED_UNIX TIMESTAMP 
                // We must REBUILD the record properties or else the other properties will be lost.
                Totals.update(where, what).exec(function (err, updated){
                    if (!err) {

                        console.log('Updating totals ended_unix...');
                        console.log(JSON.stringify(updated[0]));

                        // remove the 1st element object from the array.
                        resp.splice(0,1);

                        //tail-call recursion
                        loopEnded(resp, objParams);

                    } else {
                        callback(err, null); // totals update failure
                    }
                });
            }

            // no more records left
            else {

                console.log('TIME TO LOOP PAYOUTS');

                // start the payout loop the first time.
                //loopPayouts(resp);
            }
        }

        /**
         * This function needs to work retroactively in case 1 or more distributions are missed.
         * We will simply grab all empty receipt hashes and then using the started_unix time of
         * each record, we will know which distribution period the record falls within.
         * 
         * First, find the last finalized period that's not paid
         * Second, use that period time to search for all totals records were the receipt hash is empty and 
         * @return {[type]} [description]
         */
        processPayouts = function() {

            DistributionTracker.last({ finalized: true, paid: false }, function(err, resp) {
                
                if(!err) {

                    var lastHour = resp.lastHour,
                    lastRan = resp.lastRan;

                    var where = { receipt_hash: "", started_unix: lastRan };

                    console.log('where');
                    console.log(where);

                    Totals.find(where, function(err, resp) { 
                        
                        if(!err) {

                            console.log('resp');
                            console.log(resp);

                            // updated totals ended_unix timestamps
                            loopEnded(resp, { lastHour: lastHour, lastRan: lastRan });
                        } else {
                            callback({ error: err }, null);
                        }
                    });
                } else {
                    callback({ error: err }, null);
                }
            });
        };

        if(run === 'everything' || run === 'payouts') {
            processPayouts();
        }
    },

    // run processDistribution() & loadAvailableSupply()
    distributionThenUpdateSupply: function(callback) {

        // make sure this finalizes calculations and processes payouts.
        AutomationService.processDistribution('everything', function(err, resp) {
            if(!err) {
               
               // update available suppoly
               AutomationService.loadAvailableSupply(function(err, resp) {
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