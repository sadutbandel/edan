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
        owedEstimates : {

            cron : "* * * * *",

            task : function (context, sails) {

                if(sails.config.port === 1337) {

                    AutomationService.owedEstimates( function(err, resp) {
                        if(!err) {
                            console.log(TimestampService.utc() + JSON.stringify(resp));                       
                        } else {
                            console.log(TimestampService.utc() + JSON.stringify(err));                       
                        }
                    });
                }
            },
            context : {}
        },

        /**
         * Update the block count every minute
         * @type {Object}
         */
        blockCount : {

            cron : "* * * * *",

            task : function (context, sails) {

                if(sails.config.port === 1338) {

                    AutomationService.blockCount( function(err, resp) {
                        if(!err) {
                            console.log(TimestampService.utc() + ' Updated block count to ' + JSON.stringify(resp));                       
                        } else {
                            console.log(TimestampService.utc() + ' Problem updating block count ' + JSON.stringify(err));                       
                        }
                    });
                }
            },
            context : {}
        }
    }
};