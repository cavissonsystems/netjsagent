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

asyncEventDataModel.updateAsyncEventExecTime= function(id, time){
    if(asyncEventDataModel.asyncEventDataMap[id]){
        asyncEventDataModel.asyncEventDataMap[id].totExecutionTime += Number(time);
        asyncEventDataModel.asyncEventDataMap[id].minTime = Math.min(time,asyncEventDataModel.asyncEventDataMap[id].minTime );
        asyncEventDataModel.asyncEventDataMap[id].maxTime = Math.max(time,asyncEventDataModel.asyncEventDataMap[id].maxTime );
    }
}


asyncEventDataModel.updateAsyncEventDelay= function(id, delay){
    if(asyncEventDataModel.asyncEventDataMap[id]) {
        asyncEventDataModel.asyncEventDataMap[id].timeDelay += Number(delay);
        asyncEventDataModel.asyncEventDataMap[id].minDelay = Math.min(delay, asyncEventDataModel.asyncEventDataMap[id].minDelay);
        asyncEventDataModel.asyncEventDataMap[id].maxDelay = Math.max(delay, asyncEventDataModel.asyncEventDataMap[id].maxDelay);
    }
}

module.exports = asyncEventDataModel;
