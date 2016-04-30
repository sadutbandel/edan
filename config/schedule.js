/**
 * Scheduled tasks
 */
module.exports.schedule = {

    sailsInContext: true,
    tasks: {

        /**
         * Recalculate totals every minute to maintain realtimeness of data.
         *
         * Always check to see if 4-hours have passed since the last distribution.
         * If so, then we'll finalize that period which will force user's distribution
         * requests to create a new row in Totals.
         *
         * 4 hours in seconds is...
         * 14400 seconds = 60s * 60m * 4h
         */
        recalculateTotals : {

            cron : "* * * * *",

            task : function (context, sails) {

                if(sails.config.port === 1337) {

                    AutomationService.recalculateTotals( function(err, resp) {
                        if(!err) {
                            console.log(TimestampService.utc() + JSON.stringify(resp));                       
                        } else {
                            console.log(TimestampService.utc() + JSON.stringify(err));                       
                        }
                    });
                }
            },
            context : {}
        }
    }
};