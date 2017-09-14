/**
 * Created by netstorm on 3/30/17.
 */

function HDHttpConditionMonitorData(id,name,aliasName){
    this.conditionId = id;       // Condition Id of the method. Used for trace log only
    this.cumCount =0;          // Total Condition invocations since start of instrumentation.
    this.prevCumCount=0;      // Total Condition invocations since start of instrumentation and still last reporting.
    this.aliasName = aliasName;
    this.headerName = name
}

HDHttpConditionMonitorData.prototype.resetCounters=function(){
    this.cumCount =0;          // Total Condition invocations since start of instrumentation.
    this.prevCumCount=0;      // Total Condition invocations since start of instrumentation and still last reporting.
}

HDHttpConditionMonitorData.prototype.init=function(){
    this.prevCumCount = this.cumCount;
}

HDHttpConditionMonitorData.prototype.updateCount=function(){
    this.cumCount = ++this.cumCount;
}

module.exports = HDHttpConditionMonitorData;