/**
 * Created by Siddhant on 28-12-2016.
 */

function ndExceptionData (exceptionID,exceptionClassName){
    this.exceptionID = exceptionID; // Id of the Exception. Used for trace log only
    this.cumCount = 0; // Total exception invocations since start of instrumentation.
    this.prevCumCount = 0; // Total exception invocations since start of instrumentation andtill last reporting.
    /**
     * This flag is used to find out, if a thread is updating counts or not ? This is used to make a decission for checking a thread is alive or dead
     */
    this.isCountUpdated;
    this.exceptionClassName = exceptionClassName;
}


ndExceptionData.prototype.initOnStartInstr = function(){
    this.cumCount = 0; // Total exception invocations since start of instrumentation.
    this.prevCumCount = 0; // Total exception invocations since start of instrumentation andtill last reporting.
    this.isCountUpdated;
}

ndExceptionData.prototype.updateCumulativeCount = function()
{
    this.cumCount++;
    //This should not occur because this sumDuration is a sampleCumDur, after every report interval, we reset.
    //This case only occur if method duration comes with several days
    this.isCountUpdated = true;
}

ndExceptionData.prototype.init = function()
{
    this.prevCumCount = this.cumCount;
}

module.exports = ndExceptionData;
