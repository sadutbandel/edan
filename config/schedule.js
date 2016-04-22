/**
 * Schedule tasks like a Crontab
 */
module.exports.schedule = {

    sailsInContext: true,
    tasks: {

        // this finalizes calculations for the last period, then pays out participating accounts (every 2 hours)

        processDistribution : {

            cron : "49 * * * *",
            task : function (context, sails) {

                // production-level CRON.
                if(sails.config.port === 1337) {

                    console.log(TimestampService.utc() + ' ---------------- PROCESSING DISTRIBUTION ----------------- ');

                    AutomationService.distributionThenUpdateSupply(function(err, resp) {
                        if(!err) {
                            console.log(TimestampService.utc() + ' ---------------- DISTRIBUTION PROCESSED! ----------------- ' + JSON.stringify(resp));                       
                        } else {
                            console.log(TimestampService.utc() + ' ---------------- DISTRIBUTION FAILED... ----------------- ' + JSON.stringify(err));                       
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

                    console.log(TimestampService.utc() + ' ---------------- FIXING STUCK PENDING ----------------- ');

                    // FIND RECORDS OLDER THAN 1 MINUTE
                    AutomationService.fixStuckPending(function(err, resp) {
                        if(!err) {
                            console.log(TimestampService.utc() + ' ---------------- STUCK PENDING FIXED ----------------- ');
                        } else {
                            console.log(TimestampService.utc() + ' [ AutomationService.fixStuckPending() ] (err) ' + JSON.stringify(err));
                        }
                    });
                } 
            },
            context : {}
        },

        // Update the totals calculations for the current unpaid period every minute
        updateTotals : {

            // run every minute
            cron : "* * * * *",
            task : function (context, sails) {

                // production-level CRON.
                if(sails.config.port === 1337) {

                    console.log(TimestampService.utc() + ' ---------------- RE-CALCULATING TOTALS ----------------');

                    Totals.processTotals(function(err, resp) {

                        /**
                         * Results found! (GOOD) CONTINUE request
                         * We have the total Krai being paid out
                         */
                        if(!err) {
                            console.log(TimestampService.utc() + ' ---------------- TOTALS RECALCULATED ----------------');
                        } else {
                            console.log(TimestampService.utc() + ' [ Totals.processTotals() ] (err) ' + JSON.stringify(err));
                        }
                    });
                }
            },
            context : {}
        }
    }
};