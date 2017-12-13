/**
 * Created by harendra on 6/27/2017.
 */

var eventType='', eventName='';
var eventCount=0, avgTime= 0, minTime=0, maxTime=0, timeDelay=0;

function eventEmit(eventType, eventName, eventCount, avgTime, minTime, maxTime, timeDelay, executionTime, minDelay, maxDelay){
    this.reset();
    this.eventType = eventType;
    this.eventName = eventName;
    this.eventCount = eventCount;
    this.avgTime = avgTime;
    this.minTime = minTime;
    this.maxTime = maxTime;
    this.timeDelay = timeDelay;
    this.totExecutionTime = executionTime;
    this.minDelay = minDelay;
    this.maxDelay = maxDelay;
    this.isDataDump=false;
}

eventEmit.prototype.reset = function(){
    this.eventCount = 0;
    this.avgTime = 0;
    this.minTime = Number.MAX_VALUE;
    this.maxTime = 0;
    this.timeDelay = 0;
    this.totExecutionTime = 0;
    this.minDelay = Number.MAX_VALUE;
    this.maxDelay = 0;
}


module.exports=eventEmit;