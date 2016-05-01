/**
 * Scheduled tasks
 */
module.exports.schedule = {

    sailsInContext: true,
    tasks: {

        /**
         * Recalculates estimated krai_owed projections.
         * Also checks it 4-hours have passed for a distribution.
         * 
         * 4 hours in seconds is...
         * 14400 seconds = 60s * 60m * 4h
         */
        minutelyTotals : {

            cron : "* * * * *",

            task : function (context, sails) {

                if(sails.config.port === 1337) {

                    AutomationService.minutelyTotals( function(err, resp) {
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