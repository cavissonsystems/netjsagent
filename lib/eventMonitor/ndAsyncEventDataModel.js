/**
 * Created by Harendra on 6/27/2017.
 */

var asyncEventDataObj = require('./ndAsyncEventData'),
    asyncEventMon = require('./ndAsyncEventMonitor');

//Key:  Provider Id
//Value: ndAsyncEventData
asyncEventDataModel.asyncEventDataMap={};

function asyncEventDataModel(){}

asyncEventDataModel.insertEmitEventsIntoMap = function(eventId, eventName, eventCount, avgTime, minTime, maxTime, timeDelay, excTime, minDelay, maxDelay){
    var emitEventObj = new asyncEventDataObj("", eventName, eventCount, avgTime, minTime, maxTime, timeDelay, excTime, minDelay, maxDelay);
    asyncEventDataModel.asyncEventDataMap[eventId] = emitEventObj;
}

asyncEventDataModel.clearEventMap = function(){
    asyncEventDataModel.asyncEventDataMap={};
}

asyncEventDataModel.updateAsyncEventExecTime= function(mapObj, time){
    if(mapObj){
        mapObj.totExecutionTime += Number(time);
        mapObj.minTime = Math.min(time,mapObj.minTime );
        mapObj.maxTime = Math.max(time,mapObj.maxTime );
    }
}


asyncEventDataModel.updateAsyncEventDelay= function(mapObj, delay){
    if(mapObj) {
        mapObj.timeDelay += Number(delay);
        mapObj.minDelay = Math.min(delay, mapObj.minDelay);
        mapObj.maxDelay = Math.max(delay, mapObj.maxDelay);
    }
}

module.exports = asyncEventDataModel;
