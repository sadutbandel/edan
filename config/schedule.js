/**
 * Schedule tasks like a Crontab
 */
module.exports.schedule = {

    sailsInContext: true,
    tasks: {

        // Calculate distribution totals every 2 hours (run payout / load available_supply twice to catch missed accounts)
        processTotals : {

            cron : "0 */2 * * *",
            task : function (context, sails) {

                // production-level CRON.
                if(sails.config.port === 1338) {

                    console.log('---------------- PROCESSING DISTRIBUTION -----------------');

                    // CALCULATE TOTALS
                    AutomationService.processTotals(function(err, resp) {
                        if(!err) {
                            console.log(TimestampService.utc() + ' [ AutomationService.processTotals() ] (!err) ' + JSON.stringify(resp));

                            // PROCESS DISTRIBUTION
                            AutomationService.processPayouts(function(err, resp) {
                                if(!err) {
                                    console.log(TimestampService.utc() + ' [ AutomationService.processPayouts() ] (!err) ' + JSON.stringify(resp));
                                    
                                    // PROCESS DISTRIBUTION (again)
                                    AutomationService.processPayouts(function(err, resp) {
                                        if(!err) {
                                            console.log(TimestampService.utc() + ' [ AutomationService.processPayouts() ] (!err) ' + JSON.stringify(resp));
                                        
                                           // LOAD AVAILABLE SUPPLY
                                           AutomationService.loadAvailableSupply(function(err, resp) {
                                                if(!err) {
                                                    console.log(TimestampService.utc() + ' [ AutomationService.loadAvailableSupply() ] (!err) ' + JSON.stringify(resp));
                                                } else {
                                                    console.log(TimestampService.utc() + ' [ AutomationService.loadAvailableSupply() ] (err) ' + JSON.stringify(err));
                                                }
                                           });                                    
                                        } else {
                                            console.log(TimestampService.utc() + ' [ AutomationService.processPayouts() ] (err) ' + JSON.stringify(err));
                                        }
                                    });                                 
                                } else {
                                    console.log(TimestampService.utc() + ' [ AutomationService.processPayouts() ] (err) ' + JSON.stringify(err));
                                }
                            });
                        } else {
                            console.log(TimestampService.utc() + ' [ AutomationService.processTotals() ] (err) ' + JSON.stringify(err));
                        }
                    });
                } 
            },
            context : {}
        },

        // Fix any stuck 'pending' distribution records to be 'violations' (anything older than 1 minute is obviously stuck)
        stuckPending : {

            // run every minute
            cron : "* * * * *",
            task : function (context, sails) {

                // production-level CRON.
                if(sails.config.port === 1338) {

                    console.log('---------------- FIXING STUCK PENDING -----------------');

                    // FIND RECORDS OLDER THAN 1 MINUTE
                    AutomationService.fixStuckPending(function(err, resp) {
                        if(!err) {
                            console.log(TimestampService.utc() + ' [ AutomationService.fixStuckPending() ] (!err) ' + JSON.stringify(resp));
                        } else {
                            console.log(TimestampService.utc() + ' [ AutomationService.fixStuckPending() ] (err) ' + JSON.stringify(err));
                        }
                    });
                } 
            },
            context : {}
        }
    }
};