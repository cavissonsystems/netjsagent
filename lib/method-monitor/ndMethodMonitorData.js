/**
 * Created by Sahil on 9/29/16.
 */

var util = require("../util");
function ndMethodMonitorData(id,monId,name){
    this.methodId =id; // Method Id of the method. Used for trace log only
    this.monitoringId =monId;
    this.aliasname = name;

    this.cumCount =0;     // Total method invocations since start of instrumentation.
    this.prevCumCount =0; // Total method invocations since start of instrumentation andtill last reporting.

    this.sumDuration =0; // Sum of duration(ms) of the method invocation in the sample period.

    // Minimum and Maximum Duration for the  Sample Period.
    this.invocationCount=0;
    this.minDuration =Number.MAX_VALUE;
    this.maxDuration =0;
    this.rate = 0;

    /**
     * This flag is used to find out, if a thread is updating counts or not ? This is used to make a decission for checking a thread is alive or dead
     */
    this.isCountUpdated =false;
}

ndMethodMonitorData.prototype.reset = function()
{
    this.prevCumCount = this.cumCount;
    // Initially minDuration is assigned Maximum Value as the minimum cannot have more than that value.
   /* this.minDuration = Number.MAX_VALUE;
    this.maxDuration = 0; //Must be set to 0 so that check for max becomes easy*/

    // Reset all others to 0.

    this.minDuration = Number.MAX_VALUE;
    this.maxDuration = 0;
    this.invocationCount = 0;
    this.sumDuration = 0;
    this.avgDuration =0;
    this.rate =0;
}

ndMethodMonitorData.prototype.createMethodmonitor= function(methodId,monitoringId,duration,aliasname)
{
    this.methodId = methodId;
    this.monitoringId = ++monitoringId;
    this.aliasname = aliasname;
    this.updateDuration(duration);

}

/*ndMethodMonitorData.prototype.updateMethodmonitor = function (duration) {
    this.updateDuration(duration);
}*/

ndMethodMonitorData.prototype.updateDuration= function(duration)
{
    try {
        if (duration < this.minDuration)
            isCountUpdated = true;
        this.minDuration = duration;

        if (duration > this.maxDuration)
            this.maxDuration = duration;

        this.cumCount++;
        this.sumDuration += duration;

        this.isCountUpdated = true;
    }catch (err) {
        util.logger.warn(err);
    }
}

module.exports = ndMethodMonitorData;