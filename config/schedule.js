/**
 * Schedule tasks like a Crontab
 */
module.exports.schedule = {


    sailsInContext: true,
    tasks: {
        firstTask : {
        cron : "* * * * *",
        task : function (context, sails) {
            if(sails.config.port === 1337) {
                
            } 
            else if(sails.config.port === 1338) {
                WowDick.removeOldRecords();
            } 
        },
        context : {}
        }
    }
};
