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

    // reserved functions:
    // fspResponse, er, upd,
    // fix any stuck pending records causing perpetual 'Try Again' responses in faucet
    fixStuckPending: function(callbackSP) {

        // iterate over our response of distribution records that may be stuck 'pending'
        loopStuckPending = function(respFSP) {

            // as long as there are still elements in the array....
            if(respFSP.length > 0) {

                // always use 0 since we're going to remove it from the array when we're done.
                var key = 0;

                var whereFSP = { 
                    id: respFSP[key].id
                };

                var whatFSP = {
                    modified : TimestampService.unix(),
                    account: respFSP[key].account,
                    ip: respFSP[key].account,
                    sessionID: respFSP[key].account,
                    status: 'violation',
                    createdAt: respFSP[key].createdAt,
                    updatedAt: respFSP[key].updatedAt
                };

                // Update their stuck 'pending' record as 'violation' so they can continue with requests
                Distribution.update(where, what).exec(function (errFSP, updatedFSP){
                    if (!errFSP) {

                        //console.log('Fixing stuck record...');
                        //console.log(JSON.stringify(updatedFSP[0]));

                        // remove the 1st element object from the array.
                        respFSP.splice(0,1);

                        //tail-call recursion
                        loopStuckPending(respFSP);

                    } else {
                        callbackSP(errFSP, null); // distribution update failure
                    }
                });
            } else {
                callbackSP(null, true); // completed fixing stuck records
            }
        };

        // start finding expired pending records (over 1 minute old)
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

    // 'run' can equal 'last' or 'historical'.
    //          'last' indicates automation is running
    //          'historical' indicates manually running
    // 
    // First, run finalizeCalculations() to finalize totals for the last unpaid period.
    // Second, run processPayouts() to find all records with "" block hashes.
    // Third, run loopPayouts using those found record's accounts to distribute to owed Krai to the Totals record needing it.
    processDistribution: function(run, callbackPD) {

        var lastHour,
        lastRan;

        /**
         * First, Find the last distribution period that has not be finalized yet (or obviously been paid yet)
         * Second, calculate total accounts & total successes for all accounts during this period (last ran to last hour, this runs bi-hourly)
         * Third, save that  data for the period in DistributionTracker & mark the distribution period as 'finalized' but not 'paid'
         * Fourth, move to processPayouts().
         *
         * Reserved: matchFC, groupFC, errFC, resultsFC, keyFC, 
         */
        finalizeCalculations = function() {

            DistributionTracker.fetch({ limit: 1, finalized: false, paid: false }, function(errFC, respFC) {
                
                if(!errFC) {

                    lastHourFC = respFC[0].lastHour;
                    lastRanFC = respFC[0].started_unix;

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
                                        // mark this period as NOT paid yet...
                                        
                                        var whatFC = {
                                            created_unix: respFC[0].created_unix,
                                            started_unix: respFC[0].started_unix,
                                            ended_unix: lastHourFC,
                                            accounts: accountsCount,
                                            successes: recordsCount,
                                            finalized: true,
                                            paid: false
                                        };

                                        //console.log('whatFC');
                                        //console.log(JSON.stringify(whatFC));

                                        DistributionTracker.update(whatFC, function(errFC, respFC) {
                                            console.log(TimestampService.utc() + ' ---------------- CALCULATIONS FINALIZED ----------------');

                                            // once calculations are finalized, they won't ever be finalized again,
                                            // nor should they need to be. payouts process can fail NP now like if RPC
                                            // gets overloaded. we can simply re-run it without worrying about
                                            // any calculations needing to be finalized.
                                            processPayouts('last');
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

        // historical doesn't need to re-finalize (unless something freaky happens with Distribution records collection count?)
        // this is only triggered by the cron
        if(run === 'last') {
            finalizeCalculations();
        }

        // iterate over accounts needing payment
        // reserved:
        //      respLP, objParams, keyLP, errLP, updatedLP
        loopPayouts = function(respLP, objParamsLP) {

            // as long as there are still elements in the array....
            if(respLP.length > 0) {

                // always use 0 since we're going to remove it from the array when we're done.
                var keyLP = 0;
                    
                var payloadLP = {
                    amount: '1000000000000000000000000000',
                    //amount: resp[keyLP].raw_rai_owed,
                    wallet: Globals.paymentWallets.production,
                    source: Globals.faucetAddress,
                    destination: respLP[keyLP].account
                };

                //console.log(TimestampService.utc() + ' Sending Payload');
                //console.log(TimestampService.utc() + ' ' + JSON.stringify(payloadLP));

                SendRaiService.send(payloadLP, function(errLP, resLP) {

                    if (!errLP) {

                        var whereLP = { 
                            id: respLP[keyLP].id
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
                        //console.log(TimestampService.utc() + ' ' + JSON.stringify(whereLP));

                        //console.log(TimestampService.utc() + ' Update What LP');
                        //console.log(TimestampService.utc() + ' ' + JSON.stringify(whatLP));

                        // SAVE BLOCK HASH RECEIPT in totals row 
                        // We must REBUILD the record properties or else the other properties will be lost.
                        Totals.update(whereLP, whatLP).exec(function (errLP, updatedLP){
                            if (!errLP) {

                                //console.log(TimestampService.utc() + ' Updating receipt hash...');
                                //console.log(JSON.stringify(updatedLP[0]));

                                // remove the 1st element object from the array.
                                respLP.splice(0,1);

                                //tail-call recursion
                                loopPayouts(respLP, objParamsLP);

                            } else {
                                callbackPD(errLP, null); // totals update failure
                            }
                        });
                    } else {
                        callbackPD(errLP, null); // send rai failure
                    }
                });
            } else {

                var payloadLP = {
                    ended_unix: objParamsLP.lastHour,
                    finalized: true,
                    paid: false
                };

                //console.log('payloadLP');
                //console.log(payloadLP);

                // grab the entire record and update paid = true for this completely paid distribution
                DistributionTracker.find(payloadLP, function(errLP, respLP) {
                    
                    if(!errLP) {

                        // mark this distribution as PAID since we only got to this point since all accounts were paid.
                        respLP[0].paid = true;
                        //console.log(respLP[0]);

                        DistributionTracker.native(function(errLP, collectionLP) {
                            if (!errLP) {

                                collectionLP.update(payloadLP, respLP[0], function (errLP, updatedLP) {
                                    if (!errLP) {
                                        //console.log(updatedLP);
                                        callbackPD(null, true);
                                    } else {
                                        callbackPD(errLP, null);
                                    }
                                });
                            } else {
                                callbackPD(errLP, null);
                            }
                        });
                    } else {
                        callbackPD(errLP, null); // completed!
                    }
                });
            }
        };

        // iterate over all totals records for each account with empty hash and update ended timestamps
        // reserved:
        //      respLE, objParamsLE, keyLE, errLE, updatedLE
        loopEnded = function(respLE, objParamsLE) {

            //console.log('Loop Ended params');
            //console.log(JSON.stringify(objParamsLE));

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
                    ended_unix: objParamsLE.lastHour,
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
                Totals.update(whereLE, whatLE).exec(function (errLE, updatedLE){
                    if (!errLE) {

                        //console.log(TimestampService.utc() + ' Updating totals ended_unix...');
                        //console.log(TimestampService.utc() + ' ' + JSON.stringify(updatedLE[0]));

                        // remove the 1st element object from the array.
                        respLE.splice(0,1);

                        //tail-call recursion
                        loopEnded(respLE, objParamsLE);

                    } else {
                        callbackPD(errLE, null); // totals update failure
                    }
                });
            }

            // no more records left
            else {

                // grab the records needing payouts now that they have their end-times stored.
                // 
                //console.log('LoopEnded() Complete... Finding those needing payment')
                DistributionTracker.fetch({ limit: 2, finalized: true, paid: false }, function(errLE, respLE) {
                    
                    if(!errLE) {

                        lastHourLE = respLE[1].lastHour;
                        lastRanLE = respLE[1].lastRan;

                        var whereLE = { receipt_hash: "", started_unix: lastRanLE };

                        //console.log('Where Totals...');
                        //console.log(JSON.stringify(whereLE));

                        Totals.find(whereLE, function(errLE, respLE) { 
                            
                            if(!errLE) {

                                //console.log('Accounts needing payment');
                                //console.log(respLE);

                                // start the payout loop the first time.
                                loopPayouts(respLE, objParamsLE);
                            } else {
                                callbackPD(errLE, null); // totals update failure
                            }
                        });
                    } else {
                        callbackPD(errLE, null); // totals update failure
                    }
                });
            }
        };

        // loop over distributionTracker result(s) and either run loopPayouts() or loopEnded()
        // reserved:
        //      respDT, responseDT, errDT
        loopDt = function(respDT) {

            //console.log(TimestampService.utc() + ' loopDt() respDT.length');
            //console.log(TimestampService.utc() + ' ' + JSON.stringify(respDT));
            //console.log(TimestampService.utc() + ' ' + respDT.length);

            var keyDT = 0;

            if(respDT.length > 0) {

                var lastHourDT = respDT[keyDT].lastHour,
                lastRanDT = respDT[keyDT].lastRan;

                var whereDT = { receipt_hash: "", started_unix: lastRanDT };

                //console.log('Where Totals...');
                //console.log(JSON.stringify(whereDT));

                Totals.find(whereDT, function(errDT, responseDT) { 
                    
                    if(!errDT) {

                        // historical? go storageight to payouts and skip marking totals ended_unix timestamps again
                        if(run === 'historical') {
                            loopPayouts(responseDT, { lastHour: lastHourDT, lastRan: lastRanDT });
                        }

                        // our most recent distribution needs to have it's totals records ended_unix times marked ( they are 0 now )
                        // after this, loopEnded() will lead to loopPayouts()
                        else if(run === 'last') {
                            loopEnded(responseDT, { lastHour: lastHourDT, lastRan: lastRanDT });
                        }

                        // remove the first element from the original array before re-passing into loopDt()
                        respDT.splice(0,1);

                        // loop over any remaining results
                        loopDt(respDT);

                    } else {
                        callbackPD({ error: errDT }, null);
                    }
                });
            } else {
                callbackPD(null, true); // success
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
        processPayouts = function(whenPP) {

            var limitedPP;

            if(whenPP === 'last') {
                limitedPP = 2; // we need the last 2 so we can grab the start_unix of the most recently-finalized record.
            }
            else if(whenPP === 'historical') {
                limitedPP = 5;
            }

            var payloadPP = { 
                limit: limitedPP,
                finalized: true,
                paid: false
            };

            DistributionTracker.fetch(payloadPP, function(errPP, respPP) {
                
                if(!errPP) {

                    //console.log('DT PP respPP');
                    //console.log(JSON.stringify(respPP));

                    if(whenPP === 'last') {
                        respPP.splice(0,1); // just use the prior record
                        loopDt(respPP);
                    }
                    else if(whenPP === 'historical') {
                        loopDt(respPP);
                    }
                   
                } else {
                    callbackPD({ error: errPP }, null);
                }
            });
        };

        // if we want to run payouts historically we must say so.
        if(run === 'historical') {
            processPayouts('historical');
        }
    },

    // run processDistribution() & loadAvailableSupply()
    distributionThenUpdateSupply: function(run, callbackDU) {

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