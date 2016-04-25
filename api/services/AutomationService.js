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

    // Fixes any stuck 'pending' Distribution records to be 'Violation' so user is not stuck.
    fixStuckPending: function(callbackSP) {

        loopStuckPending = function(respFSP) {

            // as long as there are still elements in the array....
            if(respFSP.length > 0) {

                // always use 0 since we're going to remove it from the array when we're done.
                var keyFSP = 0;

                var whereFSP = { 
                    id: respFSP[keyFSP].id
                };

                var whatFSP = {
                    modified : TimestampService.unix(),
                    account: respFSP[keyFSP].account,
                    ip: respFSP[keyFSP].account,
                    sessionID: respFSP[keyFSP].account,
                    status: 'violation',
                    createdAt: respFSP[keyFSP].createdAt,
                    updatedAt: respFSP[keyFSP].updatedAt
                };

                // Update their stuck 'pending' record as 'violation' so they can continue with requests
                Distribution.native(function(errFSP, collectionFSP) {
                    if (!errFSP) {

                        collectionFSP.update(whereFSP, whatFSP, function (errFSP, updatedFSP) {
                            if (!errFSP) {
                                //console.log('Fixing stuck record...');
                                //console.log(JSON.stringify(updatedFSP[0]));

                                // remove the 1st element object from the array.
                                respFSP.splice(0,1);

                                //tail-call recursion
                                loopStuckPending(respFSP);
                            } else {
                                callbackSP(errFSP, null); // query failure
                            }
                        });
                    } else {
                        callbackSP(errFSP, null); // mongo failure
                    }
                });
            } else {
                callbackSP(null, true); // complete!
            }
        };

        // Find  pnding records over 1 minute old
        Distribution.find({ status: "pending", modified: { "$lte": TimestampService.unix() - 60 }}, function(errFSP, respFSP) {
            if(!errFSP) {
                loopStuckPending(respFSP); // start tailcall recursion
            } else {
                callbackSP(errFSP, null); // no results found
            }
        });
    },

    // fetch & load the available supply from the RPC into mongo
    loadAvailableSupply: function(callbackLS) {

        AvailableSupplyService.fetch(function(errLS, respLS) {

            if(!errLS) {
                    
                var payloadLS = {
                    modified: TimestampService.unix(),
                    raw_krai: respLS
                };

                // add a new entry for available supply
                AvailableSupply.create(payloadLS, function(errLS, respLS) {
                    if(!errLS) {
                        callbackLS(null, respLS);
                    } else {
                        callbackLS(errLS, null);
                    }
                });
            } else {
                callbackLS(errLS, null);
            }
        });
    },

    // 'run' can equal "last" or "payouts"
    // 
    //          "last" indicates automation is probably running this function
    //          "payouts" indicates we're manually running this function
    // 
    // First, run finalizeCalculations() to finalize totals for the last unpaid period.
    // Second, run processPayouts() to find all records with "" block hashes.
    // Third, run loopPayouts using those found record's accounts to distribute to owed Krai to the Totals record needing it.
    processDistribution: function(run, callbackPD) {

        /**
         * First, Find the last distribution period that has not be finalized yet
         * Second, calculate total accounts & total successes for all accounts during this period (last ran to last hour, this runs bi-hourly)
         * Third, save that  data for the period in DistributionTracker & mark the distribution period as 'finalized' but not 'paid'
         * Fourth, move to processPayouts().
         *
         * Reserved: matchFC, groupFC, errFC, resultsFC, keyFC, 
         */
        finalizeCalculations = function() {

            // false indicates "not finalized"
            DistributionTracker.last(function(errFC, respFC) {
                if(!errFC) {

                    //console.log('respFC');
                    //console.log(respFC);

                    var lastHourFC = respFC.lastHour,
                    lastRanFC = respFC.started_unix;

                    var matchFC = {

                        '$and': [
                            {
                                modified : { 
                                    '$lt': lastHourFC
                                }
                            },
                            {
                                modified : { 
                                    '$gte': lastRanFC
                                }
                            },
                            { 
                                status: 'accepted'
                            },
                        ]
                    };

                    //console.log('matchFC');
                    //console.log(JSON.stringify(matchFC));

                    var groupFC = {
                        _id: '$account',
                        count: { 
                            '$sum': 1
                        }
                    };

                    Distribution.native(function(errFC, collectionFC) {
                        if (!errFC){

                            collectionFC.aggregate([{ '$match' : matchFC }, { '$group' : groupFC }]).toArray(function (errFC, resultsFC) {
                                if (!errFC) {


                                    /**
                                     * No matches found. (bad) HALT request!
                                     * 
                                     * If NO matches are found, then there are no Distribution records yet.
                                     */
                                    if(Object.keys(resultsFC).length === 0) {
                                        callbackPD('no matches', null);
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
                                        for(keyFC in resultsFC) {
                                            accountsCount++;
                                            resultsFC[keyFC].ended_unix = lastHourFC;
                                            recordsCount += resultsFC[keyFC].count;
                                        }

                                        // create a DistributionTracker payload
                                        // mark this period as Finalized!                                        
                                        var whatFC = {
                                            created_unix: respFC.created_unix,
                                            started_unix: respFC.started_unix,
                                            ended_unix: lastHourFC,
                                            accounts: accountsCount,
                                            successes: recordsCount,
                                            finalized: true
                                        };

                                        //console.log('whatFC');
                                        //console.log(JSON.stringify(whatFC));

                                        DistributionTracker.update(whatFC, function(errFC, respFC) {
                                            console.log(TimestampService.utc() + ' ---------------- CALCULATIONS FINALIZED ----------------');
                                            processEndedUnix();
                                        });
                                    }
                                } else {
                                    callbackPD({ error: errFC }, null);
                                }
                            });
                        } else {
                            callbackPD({ error: errFC }, null);
                        }
                    });
                } else {
                    callbackPD({ error: errFC }, null);
                }
            });
        };

        /**
         * Loop over all Totals.js records (accounts) to send distribution and update hash receipt blocks.
         */
        loopPayouts = function(respLP) {

            // as long as there are still elements in the array....
            if(respLP.length > 0) {

                // always use 0 since we're going to remove it from the array when we're done.
                var keyLP = 0;
                    
                var payloadLP = {
                    //amount: '1000000000000000000000000000', // TEST
                    amount: respLP[keyLP].raw_rai_owed,
                    wallet: Globals.paymentWallets.production,
                    source: Globals.faucetAddress,
                    destination: respLP[keyLP].account
                };

                //console.log(TimestampService.utc() + ' --- Sending KRAI ---');
                //console.log(TimestampService.utc() + ' ' + JSON.stringify(payloadLP));

                SendRaiService.send(payloadLP, function(errLP, resLP) {

                    if (!errLP) {

                        //console.log(TimestampService.utc() + ' Update Totals Post-Send');
                        //console.log(TimestampService.utc() + ' ' + JSON.stringify(resLP));

                        var whereLP = { 
                            account: respLP[keyLP].account,
                            started_unix: respLP[keyLP].started_unix
                        };

                        var whatLP = {
                            paid_unix : TimestampService.unix(),
                            receipt_hash : resLP.response.block, // element we are updating (notice resLP not respLP)
                            account: respLP[keyLP].account,
                            total_count: respLP[keyLP].total_count,
                            started_unix: respLP[keyLP].started_unix,
                            ended_unix: respLP[keyLP].ended_unix,
                            percentage_owed: respLP[keyLP].percentage_owed,
                            krai_owed: respLP[keyLP].krai_owed,
                            raw_rai_owed: respLP[keyLP].raw_rai_owed
                        };

                        //console.log(TimestampService.utc() + ' Update Where LP');
                        ///console.log(TimestampService.utc() + ' ' + JSON.stringify(whereLP));

                        //console.log(TimestampService.utc() + ' Update What LP');
                        //console.log(TimestampService.utc() + ' ' + JSON.stringify(whatLP));

                        // SAVE BLOCK HASH RECEIPT in totals row 
                        // We must REBUILD the record properties or else the other properties will be lost.
                        // Update their stuck 'pending' record as 'violation' so they can continue with requests
                        Totals.native(function(errLP, collectionLP) {
                            if (!errLP) {

                                collectionLP.update(whereLP, whatLP, function (errLP, updatedLP) {
                                    if (!errLP) {

                                        //console.log(TimestampService.utc() + ' Updating receipt hash...');
                                        //console.log(JSON.stringify(updatedLP[0]));

                                        // remove the 1st element object from the array.
                                        respLP.splice(0,1);

                                        //tail-call recursion
                                        loopPayouts(respLP);

                                    } else {
                                        callbackPD(errLP, null); // query failure
                                    }
                                });
                            } else {
                                callbackPD(errLP, null); // mongo failure
                            }
                        });
                    } else {
                        callbackPD(errLP, null); // send rai failure
                    }
                });
            } else {
                callbackPD(null, true); // all records paid out
            }
        };

        /**
         * Loop over all Totals.js records (accounts) to update their ended_unix timestamps before paying out.
         */
        loopEnded = function(respLE) {

            if(respLE.length > 0) {

                var keyLE = 0;

                var whereLE = { 
                    account: respLE[keyLE].account,
                    started_unix: respLE[keyLE].started_unix
                };

                var whatLE = {
                    paid_unix : respLE[keyLE].paid_unix,
                    receipt_hash : "", // we know it's an empty string, but we have to explicitly define it here, or else '' will be passed and cause failure of insertion.
                    account: respLE[keyLE].account,
                    total_count: respLE[keyLE].total_count,
                    started_unix: respLE[keyLE].started_unix,
                    ended_unix: TimestampService.lastHour(),
                    percentage_owed: respLE[keyLE].percentage_owed,
                    krai_owed: respLE[keyLE].krai_owed,
                    raw_rai_owed: respLE[keyLE].raw_rai_owed
                };
                
                //console.log(TimestampService.utc() + ' Update Where LE');
                //console.log(TimestampService.utc() + ' ' + JSON.stringify(whereLE));

                //console.log(TimestampService.utc() + ' Update What LE');
                //console.log(TimestampService.utc() + ' ' + JSON.stringify(whatLE));


                // SAVE ENDED_UNIX TIMESTAMP 
                // We must REBUILD the record properties or else the other properties will be lost.
                Totals.native(function(errLE, collectionLE) {
                    if (!errLE) {

                        collectionLE.update(whereLE, whatLE, function (errLE, collectionLE) {
                            if (!errLE) {

                                //console.log(TimestampService.utc() + ' Updating totals ended_unix...');
                                //console.log(TimestampService.utc() + ' ' + JSON.stringify(updatedLE[0]));

                                // remove the 1st element object from the array.
                                respLE.splice(0,1);

                                //tail-call recursion
                                loopEnded(respLE);

                            } else {
                                callbackPD(errLE, null); // query failure
                            }
                        });
                    } else {
                        callbackPD(errLE, null); // mongo failure
                    }
                });
            }

            // no more records left? process payouts!
            else {
                processPayouts();
            }
        };

        /**
         * Loops over all empty ("") receipt_hashes for realtime records (ended_unix: 0) to update their ended_unix timestamps
         */
        processEndedUnix = function() {

            // grab all records needing payouts where they have been finalized (not a realtime record)
            var wherePE = { receipt_hash: "", ended_unix: 0 };

            Totals.find(wherePE, function(errPE, respPE) { 
                
                if(!errPE) {
                    loopEnded(respPE); // start loopEnded 
                } else {
                    callbackPD(errPE, null); // query failure
                }
            });
        }

        /**
         * Loops over all empty ("") receipt_hashes to process payouts for each account.
         */
        processPayouts = function() {

            // grab all records needing payouts where they have been finalized (not a realtime record)
            var wherePP = { receipt_hash: "", ended_unix: { "$ne": 0 }};

            Totals.find(wherePP, function(errPP, respPP) { 
                
                if(!errPP) {
                    loopPayouts(respPP); // start loopPayout 
                } else {
                    callbackPD(errPP, null); // query failure
                }
            });
        };

        /**
         * Using bootstrap.js(manual) or schedule.js(automatic)...
         * We can run everything simply using 'last', which starts by finalizing calculations...
         * OR we can just run 'payouts' assuming the final calculations have been completed...
         */
        if(run === 'last') {
            finalizeCalculations();
        } else if(run === 'payouts') {
            processPayouts();
        }
    },

    // run processDistribution() & loadAvailableSupply()
    distributionThenUpdateSupply: function(run, callbackDU) {

        if(run === 'none') {
            callbackDU('Manual distribution skipped (bootstrap.js)', null);
        }

        // make sure this finalizes calculations and processes payouts for the past distribution only
        AutomationService.processDistribution(run, function(errDU, respDU) {
            if(!errDU) {
               
               // update available suppoly
               AutomationService.loadAvailableSupply(function(errDU, respDU) {
                    if(!errDU) {
                        callbackDU(null, respDU);
                    } else {
                        callbackDU(errDU, null);
                    }
               });                            
            } else {
                callbackDU(errDU, null);
            }
        });
    },

    // enter the desired payout amount per day here
    loadPayoutSchedule: function() {

        var payloadLP = {
            created_unix: TimestampService.unix(),
            hourly_rai: '21000000000000000000000000000000000' // 21,000,000/hr
        };

        PayoutSchedule.create(payloadLP, function(errLP, respLP) {
            
            // processed
            if(!errLP) {
                console.log(TimestampService.utc() + ' ' + JSON.stringify(respLP));
            } else { // not processed
                console.log(TimestampService.utc() + ' ' + JSON.stringify(errLP));
            }
        });
    }
};