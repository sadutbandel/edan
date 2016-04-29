/**
 * Scheduled tasks
 */
module.exports.schedule = {

    sailsInContext: true,
    tasks: {

        /**
         * A task that runs every minute to check the most recent DistributionTracker record
         * We want to see if we're in a new time-frame yet or still allowing solves to accumulate.
         *
         * 4 hours in seconds is...
         * 14400 seconds = 60s * 60m * 4h
         */
        checkDistribution : {

            cron : "* * * * *",

            task : function (context, sails) {

                if(sails.config.port === 1337) {

                    AutomationService.checkDistribution( function(err, resp) {
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