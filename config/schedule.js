/**
 * Schedule tasks like a Crontab
 */
module.exports.schedule = {
    sailsInContext: true,
    tasks: {
        firstTask : {
        cron : "* * * * *",
        task : function (context, sails) {
            //WowDick.cleanupOldRecords();
        },
        context : {}
        }
    }
};
