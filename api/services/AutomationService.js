/**
* AutomationService.js
*
* @description :: Handles various automated tasks:
*
*                   blockCount() stores the current block count of RaiBlocks into Cache (used in Explorer page)
*                   owedEstimates() calculates the estimates for owed Krai
*                   loadAvailableSupply() loads the available supply into Cache
*                   processDistribution() finalizes the current unpaid period, pays everyone, and creates a new DT period.
*/

module.exports = {

    blockCount: function(callback) {

        BlockCountService.fetch(function(err, resp) {
            
            if(!err) {
                Cache.native(function(err, collection) {
                    if (!err) {

                        collection.update({ entry: 'block_count' }, { entry: 'block_count', modified: TimestampService.unix(), count: resp.response.count }, { upsert: true }, function (err, upserted) {
                            if (!err) {
                                callback(null, resp.response.count);
                            } else {
                                callback(err, null); // error with mongodb
                            }
                        });
                    } else {
                        callback(err, null); // error with mongodb
                    }
                });
            } else {
                callback(err, null);
            }
        });
    },

    /**
     * Calculates the owed amounts based on each account's total count.
     *
     * First, fetch the last distribution tracker record.
     * Second, determine if we should finalize or not
     * Third, if it's been over 4 hours, finalize the period then proceed to update totals regardless.
     * Fourth, calculate the owed amounts
     */
    owedAmounts: function(callback) {

        // 1
        lastDistribution = function() {

            console.log('lastDistribution');
            DistributionTracker.last(function(err, resp) {
            
                if(!err) {
                    determineFinalization(resp);
                } else {
                    callback(err, null);
                }
            });
        };
        
        // 2
        determineFinalization = function(resp) {

            console.log('determineFinalization');
            console.log('resp');
            console.log(resp);

            // if 4+ hours have passed since finalization and we are in the current-period record, finalize the period.
            if(resp.hoursSinceLastRan >= 4 && resp.live) {
                finalizePeriod(resp, true);
            } else { // otherwise, 
                nonFinalizedTotals(resp, false);
            }
        };

        // 3 pt.1 (optional)
        finalizePeriod = function(resp, finalize) {

            console.log('finalizePeriod');

            DistributionTracker.native(function(err, collection) {
                if (!err) {

                    collection.update({ ended_unix: 0 }, { created_unix: resp.created_unix, started_unix: resp.started_unix, ended_unix: resp.lastHour, accounts: resp.accounts, successes: resp.successes }, { upsert: true }, function (err, upserted) {
                        if (!err) {
                            callback(null, true);
                        } else {
                            callback(err, null); // error with mongodb
                        }
                    });
                } else {
                    callback(err, null); // error with mongodb
                }
            });

            // mark this period as finalized first, then...
            nonFinalizedTotals(resp, finalize);
        }

        // 3 pt.2 (required)
        nonFinalizedTotals = function(resp, finalize) {
            
            console.log('nonFinalizedTotals');

            Totals.native(function(err, collection) {
                if (!err){
                    collection.find({ ended_unix: 0 }).sort({ 'started_unix': -1 }).toArray(function (err, results) {
                        if (!err) {
                            calculateOwedAmounts(results, finalize);
                        } else {
                            callback({ message: 'server_error' }, null); // error with mongodb
                        }
                    });
                } else {
                    callback({ message: 'server_error' }, null); // error with mongodb
                }
            });
        }

        // 4
        calculateOwedAmounts = function(results, finalize) {

            console.log('calculateOwedAmounts');

            var complete_count = 0;

            // complete a totals count
            for(var key in results) {
                complete_count+= results[key].total_count;
            }

            console.log('complete_count');
            console.log(complete_count);

            callback(null, complete_count);        
        }

        // kick off everything
        lastDistribution();
    },

    // updates the available supply Cache entry
    loadAvailableSupply: function(callback) {

        AvailableSupplyService.fetch(function(err, resp) {

            if(!err) {

                Cache.native(function(err, collection) {
                    if (!err) {

                        collection.update({ entry: 'available_supply' }, { entry: 'available_supply', modified: TimestampService.unix(), raw_krai: resp }, { upsert: true }, function (err, upserted) {
                            if (!err) {
                                callback(null, true);
                            } else {
                                callback(err, null); // error with mongodb
                            }
                        });
                    } else {
                        callback(err, null); // error with mongodb
                    }
                });
            } else {
                callback(err, null);
            }
        });
    },

    processDistribution: function(run, callbackPD) {

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