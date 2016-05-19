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
     * Second, gather totals records to prepare for counting successes / accounts
     * Third, count all of the total successes and accounts for this period
     * Fourth, calculate percentages owed, owed amounts per account
     * Fifth, update Totals records with ended time, owed %, owed amount
     */
    owedAmounts: function(callback) {

        // 1
        fetchLastDistribution = function() {

            console.log('fetchLastDistribution()');
            DistributionTracker.last(function(err, resp) {
            
                if(!err) {
                    gatherTotalsRecords(resp);
                } else {
                    callback(err, null);
                }
            });
        };

        // 2
        gatherTotalsRecords = function(dtResp) {

            console.log('gatherTotalsRecords()');
            Totals.native(function(err, collection) {
                if (!err){
                    collection.find({ ended_unix: 0 }).sort({ 'started_unix': -1 }).toArray(function (err, results) {
                        if (!err) {
                            countAll(dtResp, results);
                        } else {
                            callback({ message: 'server_error' }, null); // error with mongodb
                        }
                    });
                } else {
                    callback({ message: 'server_error' }, null); // error with mongodb
                }
            });
        }

        // 3
        countAll = function(dtResp, tResults) {

            console.log('countAll');
            dtResp.successes = 0;
            dtResp.accounts = 0;

            // add counts to dtResp object
            for(var key in tResults) {
                dtResp.accounts++;
                dtResp.successes+= tResults[key].total_count;
            }

            updateDistributionTracker(dtResp, tResults)
        };

        // 4
        updateDistributionTracker = function(dtResp, tResults) {

            console.log('updateDistributionTracker()');
            console.log('dtResp');
            console.log(dtResp);

            // we don't want to overwrite created if we are updating the record
            var created_unix,
            ended_unix;

            if(dtResp.created_unix) {
                created_unix = dtResp.created_unix;
            } else {
                created_unix = TimestampService.unix();
            }

            if(dtResp.live) {
                ended_unix = 0;
            } else {
                ended_unix = dtResp.ended_unix;
            }

            // create the payload for delivering to DT
            var payload = {
                created_unix: created_unix,
                started_unix: dtResp.started_unix,
                ended_unix: ended_unix,
                accounts: dtResp.accounts,
                successes: dtResp.successes
            };

            var where = {
                started_unix: payload.started_unix
            };

            DistributionTracker.native(function(err, collection) {
                if (!err) {

                    collection.update(where, payload, { upsert: true }, function (err, updated) {
                        if (!err) {
                            calculateOwedAmounts(dtResp, tResults);
                        } else {
                            callback(err, null);
                        }
                    });
                } else {
                    callback(err, null);
                }
            });
        };

        // 5
        calculateOwedAmounts = function(dtResp, results) {

            console.log('calculateOwedAmounts()');

            //var payout_amount = Globals.hourlyKrai * resp.hoursSinceLastRan;
            var payout_amount = Globals.hourlyKrai * 4;

            // complete a totals count
            for(var key in results) {
                results[key].percentage_owed = results[key].total_count / dtResp.successes;
                results[key].krai_owed = Math.floor(results[key].percentage_owed * payout_amount);
                results[key].raw_rai_owed = results[key].krai_owed + '' + Globals.rawKrai;
            }

            loopEnded(results);
        };

        // 6
        loopEnded = function(results) {

            console.log('loopEnded()');

            if(results.length > 0) {

                var where = { 
                    account: results[0].account,
                    started_unix: results[0].started_unix
                };

                var what = {
                    paid_unix : results[0].paid_unix,
                    receipt_hash : "", // we know it's an empty string, but we have to explicitly define it here, or else '' will be passed and cause failure of insertion.
                    account: results[0].account,
                    total_count: results[0].total_count,
                    started_unix: results[0].started_unix,
                    ended_unix: TimestampService.lastHour(),
                    percentage_owed: results[0].percentage_owed,
                    krai_owed: results[0].krai_owed,
                    raw_rai_owed: results[0].raw_rai_owed
                };

                Totals.native(function(err, collection) {
                    if (!err) {

                        collection.update(where, what, function (err, collection) {
                            if (!err) {

                                // remove the 1st element object from the array.
                                results.splice(0,1);

                                // tail-call recursion
                                loopEnded(results);

                            } else {
                                callback(err, null); // query failure
                            }
                        });
                    } else {
                        callback(err, null); // mongo failure
                    }
                });
            }

            // no more records left? process payouts!
            else {
                console.log('no more records left');
                //processPayouts();
            }
        };

        // kick off everything
        fetchLastDistribution();
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