/**
 * Created by jaumard on 27/02/2015.
 */
module.exports.schedule = {
    sailsInContext: true,
    tasks: {
        firstTask : {
        cron : "* * * * *",
        task : function (context, sails) {

            //console.log('Task running');
            WowDick.removeOldRecords();

        },
        context : {}
        }
    }
};
