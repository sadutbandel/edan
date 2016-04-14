/**
 * Schedule tasks like a Crontab
 */
module.exports.schedule = {

    sailsInContext: true,
    tasks: {
        firstTask : {

            // run every 2 hours
            cron : "0 */2 * * *",
            task : function (context, sails) {

                // production-level CRON.
                if(sails.config.port === 1338) {

                    console.log('-------------------------------------------------------');
                    console.log('-------------------------------------------------------');
                    console.log('---------------- DISTRIBUTION RUNNING -----------------');
                    console.log('-------------------------------------------------------');
                    console.log('-------------------------------------------------------');

                    // CALCULATE TOTALS
                    AutomationService.processTotals(function(err, resp) {
                        if(!err) {

                            console.log(TimestampService.utc() + ' [ AutomationService.processTotals() ] (!err) ' + JSON.stringify(resp));
                                
                            // PROCESS DISTRIBUTION
                            AutomationService.processPayouts(function(err, resp) {
                                if(!err) {
                                    console.log(TimestampService.utc() + ' [ AutomationService.processPayouts() ] (!err) ' + JSON.stringify(resp));
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
        }
    }
};
