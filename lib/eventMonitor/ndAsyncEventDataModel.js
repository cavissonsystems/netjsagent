/**
 * Created by Harendra on 6/27/2017.
 */

var asyncEventDataObj = require('./ndAsyncEventData'),
    asyncEventMon = require('./ndAsyncEventMonitor');

//Key:  Provider Id
//Value: ndAsyncEventData
asyncEventDataModel.asyncEventDataMap={};

function asyncEventDataModel(){}

asyncEventDataModel.insertEmitEventsIntoMap = function(eventId, eventName, eventCount, avgTime, minTime, maxTime, timeDelay, excTime){
    var emitEventObj = new asyncEventDataObj("", eventName, eventCount, avgTime, minTime, maxTime, timeDelay, excTime);
    asyncEventDataModel.asyncEventDataMap[eventId] = emitEventObj;
}

asyncEventDataModel.clearEventMap = function(){
    asyncEventDataModel.asyncEventDataMap={};
}

asyncEventDataModel.updateAsyncEventExecTime= function(id, time){
    if(asyncEventDataModel.asyncEventDataMap[id])
        asyncEventDataModel.asyncEventDataMap[id].totExecutionTime += Number(time);
}

asyncEventDataModel.updateAsyncEventDelay= function(id, delay){
    if(asyncEventDataModel.asyncEventDataMap[id])
        asyncEventDataModel.asyncEventDataMap[id].timeDelay += Number(delay);
}

module.exports = asyncEventDataModel;