/**
* AutomationService.js
*
* @description :: Handles various automated tasks such as:
* 
*                      Loading the available supply after successfully distributing to all accounts.
*                      Recalculate totals for DistributionTracker for the current period.
*/

module.exports = {

    recalculateTotals: function(callback) {

        DistributionTracker.last(function(err, resp) {
            
            if(!err) {
                callback(null, resp);
            } else {
                callback(err, null);
            }
        });
    },

    // cache current available supply
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

                    console.log('matchFC');
                    console.log(JSON.stringify(matchFC));

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
                                            if(!errFC) {
                                                console.log(TimestampService.utc() + ' ---------------- FINALIZING CALCULATIONS SUCCESS ----------------');
                                                processEndedUnix();
                                            } else {
                                                console.log(TimestampService.utc() + ' ---------------- FINALIZING CALCULATIONS ERROR! ----------------');
                                                callbackPD({ error: errFC }, null);
                                            }
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
                    //amount: '0', // TEST
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
    }
};