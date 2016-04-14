/**
* AutomationService.js
*
* @description :: Distribution / Payout Scripts
*/

module.exports = {

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

        /**
         * Find any totals records where they are not paid yet (no receipt_hash)
         */
        Totals.find({ receipt_hash: "0" }, function(err, resp) {
            
            if(!err) {

                /**
                 * Iterate through all the non-paid records results and create a payload to send them mrai
                 */
                
                // testing to limit 3 if I don't want to limit 1
                //var loop = 0;

                for(key in resp) {

                    /*
                    if(loop >= 1){
                        break;
                    }
                    */

                    // retain this record's IP for when we must update their totals record after they receive payment
                    var recordID = resp[key].id;

                    SendRaiService.send({
                        amount: resp[key].mrai_owed_raw,
                        wallet: Globals.paymentWallets.production,
                        source: Globals.faucetAddress,
                        destination: resp[key].account
                    }, function(err, res) {

                        if (!err) {

                            // Update their totals row once we are done sending. 
                            // We must REBUILD the record or else the other properties will be lost.
                            Totals.update({ id: recordID }, {
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
                            }).exec(function (err, updated){
                                if (!err) {
                                    callback(null, updated[0]);
                                } else {
                                    callback(err, null);
                                }
                            });
                        } else {
                            callback(err, null);
                        }
                    });
    
                    break; // LIMIT 1
                   
                    //loop++;

                } // end FOR loop
            } else {
                callback(err, null);
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