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
    // 'run' can equal 'last' or 'historical'.
    //          'last' indicates automation is running
    //          'historical' indicates manually running
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

            DistributionTracker.fetch({ limit: 1, finalized: false, paid: false }, function(err, resp) {
                
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
                                            console.log(TimestampService.utc() + ' ---------------- CALCULATIONS FINALIZED ----------------');

                                            // once calculations are finalized, they won't ever be finalized again,
                                            // nor should they need to be. payouts process can fail now like if RPC
                                            // gets overloaded, and we can simply re-run it without worrying about
                                            // any calculations needing to be finalized.
                                            processPayouts('last');
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

        // historical doesn't need to re-finalize (unless something freaky happens with Distribution records collection count?)
        // this is only triggered by the cron
        if(run === 'last') {
            finalizeCalculations();
        }

        // iterate over accounts needing payment
        loopPayouts = function(resp, objParams) {

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
                            receipt_hash : res.response.block, // element we are updating
                            account: resp[key].account,
                            total_count: resp[key].total_count,
                            started_unix: resp[key].started_unix,
                            ended_unix: resp[key].ended_unix,
                            percentage_owed: resp[key].percentage_owed,
                            krai_owed: resp[key].krai_owed,
                            raw_rai_owed: resp[key].raw_rai_owed
                        };

                        // SAVE BLOCK HASH RECEIPT in totals row 
                        // We must REBUILD the record properties or else the other properties will be lost.
                        Totals.update(where, what).exec(function (err, updated){
                            if (!err) {

                                console.log('Updating receipt hash...');
                                console.log(JSON.stringify(updated[0]));

                                // remove the 1st element object from the array.
                                resp.splice(0,1);

                                //tail-call recursion
                                loopPayouts(resp, objParams);

                            } else {
                                callback(err, null); // totals update failure
                            }
                        });
                    } else {
                        callback(err, null); // send rai failure
                    }
                });
            } else {

                console.log('PAYMENTS COMPLETE FOR PERIOD!');
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
                callback(null, objParams); // completed!
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

                // SAVE ENDED_UNIX TIMESTAMP 
                // We must REBUILD the record properties or else the other properties will be lost.
                Totals.update(where, what, { upsert: false }).exec(function (err, updated){
                    if (!err) {

                        console.log('Updating totals ended_unix...');
                        console.log(JSON.stringify(updated));

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
                console.log('Starting looping payouts');
                // start the payout loop the first time.
                loopPayouts(resp, objParams);
            }
        };

        // loop over DT result(s) and either loopPayouts() or loopEnded()
        loopDt = function(resp) {

            if(resp.length > 0) {

                var lastHour = resp.lastHour,
                lastRan = resp.lastRan;

                var where = { receipt_hash: "", started_unix: lastRan };

                Totals.find(where, function(err, response) { 
                    
                    if(!err) {

                        // historical? go straight to payouts and skip marking totals ended_unix timestamps again
                        if(when === 'historical') {
                            loopPayouts(response, { lastHour: lastHour, lastRan: lastRan });
                        }

                        // our most recent distribution needs to have it's totals records ended_unix times marked ( they are 0 now )
                        // after this, loopEnded() will lead to loopPayouts()
                        else if(when === 'last') {
                            loopEnded(response, { lastHour: lastHour, lastRan: lastRan });
                        }

                        // remove the first element from the original array before re-passing into loopDt()
                        resp.splice(0,1);

                        // loop over any remaining results
                        loopDt(resp);

                    } else {
                        callback({ error: err }, null);
                    }
                });
            } else {
                console.log('loopDt() complete!');
                callback(null, true); // success
            }
        };

        /**
         *
         * 'when' is either 'historical' or 'last'.
         *     'last' indicates the most recently finished distribution.
         *     'historical' indicates we're running this manually from bootstrap and need to do this for history.
         * First, find the last finalized, unpaid period.
         * Second, using the unix times of that last period, 
         *         find records in Totals that need payment in the last finalized-unpaid period.
         * Third,
         * 
         */
        processPayouts = function(when) {

            var limitedTo;

            if(when === 'last') {
                limitedTo = 1;
            }
            else if(when === 'historical') {
                limitedTo = 5;
            }

            DistributionTracker.fetch({ limit: limitedTo, finalized: true, paid: false }, function(err, resp) {
                
                if(!err) {
                    // loop over dt records
                    loopDt(resp);
                } else {
                    callback({ error: err }, null);
                }
            });
        };

        if(run === 'last') {
            processPayouts('last');
        }
    },

    // run processDistribution() & loadAvailableSupply()
    distributionThenUpdateSupply: function(callback) {

        // make sure this finalizes calculations and processes payouts for the past distribution only
        AutomationService.processDistribution('last', function(err, resp) {
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