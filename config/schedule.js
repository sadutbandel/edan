/**
 * Schedule tasks like a Crontab
 */
module.exports.schedule = {

    sailsInContext: true,
    tasks: {

        // this finalizes calculations for the last period, then pays out participating accounts (every 2 hours)
        processDistribution : {

            cron : "0 * * * *",
            task : function (context, sails) {

                // production-level CRON.
                if(sails.config.port === 1337) {

                    // prevent collision with minutely calculations
                    setTimeout(function () {
                        AutomationService.distributionThenUpdateSupply('last', function(errPD, respPD) {
                            if(!errPD) {
                                console.log(TimestampService.utc() + ' ---------------- DISTRIBUTION PROCESSING SUCCESS ----------------- ');                       
                            } else {
                                console.log(TimestampService.utc() + ' ---------------- DISTRIBUTION PROCESSING FAILURE! ----------------- ' + JSON.stringify(errPD));                       
                            }
                        });
                    }, 30000);

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
                    AutomationService.fixStuckPending(function(errSP, respSP) {
                        if(!errSP) {
                            //console.log(TimestampService.utc() + ' ---------------- STUCK PENDING SUCCESS ----------------- ');
                        } else {
                            console.log(TimestampService.utc() + ' ---------------- STUCK PENDING FAILED! ----------------- ' + JSON.stringify(errSP));
                        }
                    });
                } 
            },
            context : {}
        },

        // Update the totals calculations for the current unpaid period every minute
        processTotals : {

            // run every minute
            cron : "* * * * *",
            task : function (context, sails) {

                // production-level CRON.
                if(sails.config.port === 1337) {

                    //setTimeout(function () {

                        Totals.processTotals(function(errUT, respUT) {

                            /**
                             * Results found! (GOOD) CONTINUE request
                             * We have the total Krai being paid out
                             */
                            if(!errUT) {
                                console.log(TimestampService.utc() + ' ---------------- TOTALS RECALCULATION SUCCESS ---------------- ');
                            } else {
                                console.log(TimestampService.utc() + ' ---------------- TOTALS RECALCULATION FAILED! ---------------- ' + JSON.stringify(errUT));
                            }
                        });

                    //}, 5000);
                }
            },
            context : {}
        }
    }
};