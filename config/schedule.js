/**
 * Schedule tasks like a Crontab
 */
module.exports.schedule = {

    sailsInContext: true,
    tasks: {

        // this finalizes calculations for the last period, then pays out participating accounts (every 2 hours)
        processDistribution : {

            cron : "36 * * * *",
            task : function (context, sails) {

                // production-level CRON.
                if(sails.config.port === 1337) {

                    AutomationService.distributionThenUpdateSupply(function(err, resp) {
                        if(!err) {
                            console.log(TimestampService.utc() + ' ---------------- DISTRIBUTION PROCESSING SUCCESS ----------------- ' + JSON.stringify(resp));                       
                        } else {
                            console.log(TimestampService.utc() + ' ---------------- DISTRIBUTION PROCESSING FAILURE! ----------------- ' + JSON.stringify(err));                       
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
                if(sails.config.port === 1337) {

                    // FIND RECORDS OLDER THAN 1 MINUTE
                    AutomationService.fixStuckPending(function(err, resp) {
                        if(!err) {
                            console.log(TimestampService.utc() + ' ---------------- STUCK PENDING SUCCESS ----------------- ');
                        } else {
                            console.log(TimestampService.utc() + ' ---------------- STUCK PENDING FAILED! ----------------- ' + JSON.stringify(err));
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

                    Totals.processTotals(function(err, resp) {

                        /**
                         * Results found! (GOOD) CONTINUE request
                         * We have the total Krai being paid out
                         */
                        if(!err) {
                            console.log(TimestampService.utc() + ' ---------------- TOTALS RECALCULATION SUCCESS ---------------- ');
                        } else {
                            console.log(TimestampService.utc() + ' ---------------- TOTALS RECALCULATION FAILED! ---------------- ' + JSON.stringify(err));
                        }
                    });
                }
            },
            context : {}
        }
    }
};