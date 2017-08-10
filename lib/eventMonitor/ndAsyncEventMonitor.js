/**
 * Created by Harendra on 6/27/2017.
 */


var asyncDataModel = require('./ndAsyncEventDataModel'),
    asyncEventData = require('./ndAsyncEventData'),
    util = require('./../util'),
    AgentSetting = require("./../agent-setting"),
    samples = require('../nodetime/lib/samples'),
    compareVersion = require('../utils/compare-verssions');

var asyncWrap;
try {
    asyncWrap = compareVersion(process.version, '6.0.0') < 0 ? console.log("*** Error in requiring async_wrap in ndAsyncEventMonitor file because node version is less than 6.0.0 *** "):compareVersion(process.version, '8.0.0') === -1? process.binding('async_wrap') : require('async_hooks');
}catch(e){
    asyncWrap=undefined;
    console.log("*** Error in requiring async_wrap in ndAsyncEventMonitor file  *** ");
}

var eventIdNameMap = {};                                  //Creating local map for all events because same events comes with different ids.
function asyncEventMon(){}

asyncEventMon.asyncEventDataMap={};
asyncEventMon.handleAsyncEventMonitor = function() {
    if (asyncWrap) {
        if (AgentSetting.isAsyncEventMonitorEnable && AgentSetting.agentMode >= 3) {
            asyncEventMon.start();
        }
        else {
            asyncEventMon.stop();
        }
    }
}

asyncEventMon.start = function(){
    try {
        util.logger.info(AgentSetting.currentTestRun,'| AsyncEventMonitor has been started...' );
        //Creating global map (KEY:provide's Id and VALUE:Object of asyncEventData) for all asynchronous events
        var eventCount=0, avgTime=0, minTime=0, maxTime=0, timeDelay=0, executionTime=0;
        for (var key in asyncWrap.Providers) {
            asyncDataModel.insertEmitEventsIntoMap(asyncWrap.Providers[key], key, eventCount, avgTime, minTime, maxTime, timeDelay, executionTime );
        }
        asyncWrap.setupHooks({init, pre, post, destroy});
        asyncWrap.enable();
        asyncEventMon.startAsyncEventMonitor();

    }
    catch(e){
        util.logger.error(AgentSetting.currentTestRun + " |Error in start method of async event emitter  : " ,e);
    }
}

asyncEventMon.stop = function(){
    try {
        util.logger.info(AgentSetting.currentTestRun, ' | AsyncEventMonitor has been Stopped !!!');
        if(asyncWrap)
            asyncWrap.disable();
        asyncEventMon.stopAsyncEventMonitor();
        asyncDataModel.clearEventMap();
    }
    catch(e){
        util.logger.error(AgentSetting.currentTestRun + " |Error in stop method of async event emitter  : " ,e);
    }

}

function init(uid, provider, parentUid, parentHandle) {
    // When a handle is created, collect the stack trace such that we later
    // can see what involved the handle constructor.
    // Compute the full stack and store on the `Map` using the `uid` as key.
    if(asyncDataModel.asyncEventDataMap[provider])
    asyncDataModel.asyncEventDataMap[provider].eventCount++;
    var temp={}
    temp.startTime=new Date().getTime();
    temp.provider=provider;
    temp.timeDelay=0;
    temp.executionTime=0;
    eventIdNameMap[uid]=temp;


}
function pre(uid) {
    // A callback is about to be called, update the `currentUid` such that
    // it is correct for when another handle is initialized or `getStack` is
    // called.
    var date=new Date().getTime();
    var delay = date - Number(eventIdNameMap[uid].startTime);
    eventIdNameMap[uid].timeDelay = delay;
    eventIdNameMap[uid].startTime = date;
    asyncDataModel.updateAsyncEventDelay(eventIdNameMap[uid].provider,delay);
}
function post(uid, didThrow) {
    // At the time of writing there are some odd cases where there is no handle
    // context, this line prevents that from resulting in wrong stack trace. But
    // the stack trace will be shorter compared to what ideally should happen.
    var executionTime = new Date().getTime() - eventIdNameMap[uid].startTime;
    eventIdNameMap[uid].executionTime = executionTime;
    asyncDataModel.updateAsyncEventExecTime(eventIdNameMap[uid].provider,executionTime);

}

function destroy(uid) {
    // Once the handle is destroyed no other handle objects can be created with
    // this handle as its immediate context. Thus its associated stack can be
    // deleted.

    delete eventIdNameMap[uid];
}

asyncEventMon.asyncEventTimer=undefined;
asyncEventMon.startAsyncEventMonitor = function(){
        if (AgentSetting.isTestRunning) {
            if(asyncEventMon.asyncEventTimer === undefined)
                asyncEventMon.asyncEventTimer = setInterval(asyncEventMon.dumpAsyncEventData, AgentSetting.ndMonitorInterval);
        }
}

asyncEventMon.dumpAsyncEventData = function(){
    try {
       // var eventDataMap = asyncDataModel.getEventDataMap();
        for (var i in asyncDataModel.asyncEventDataMap) {
            var events = asyncDataModel.asyncEventDataMap[i];
            if (events) {
                var data = asyncEventMon.create87Record(i, events)+'\n';
                events.reset();
                samples.toBuffer(data);
            }else{
            }
        }
    }
    catch(err){
        util.logger.error(AgentSetting.currentTestRun + " |Error in dumpAsyncEventData method of async event emitter  : " ,err);
    }
}

asyncEventMon.create87Record = function(id, value){
        var asyncEventData = "";
        asyncEventData = '87,';
        asyncEventData += AgentSetting.vectorPrefixID;
        asyncEventData += id;
        asyncEventData += ':';
        asyncEventData += AgentSetting.vectorPrefix;
        asyncEventData += value.eventName;
        asyncEventData += '|';
        asyncEventData += value.eventCount;
        asyncEventData += ' ';
        asyncEventData += value.totExecutionTime;
        asyncEventData += ' ';
        asyncEventData += value.timeDelay;
        return asyncEventData;
}
asyncEventMon.stopAsyncEventMonitor = function(){
    try{
        util.logger.info(AgentSetting.currentTestRun + " | Cleaning AsyncEventMonitor  Timer .");
        clearInterval(asyncEventMon.asyncEventTimer);
    }
    catch(err){
        util.logger.error(AgentSetting.currentTestRun + " |Error in stopAsyncEventMonitor method of async event emitter  : " ,err);
    }
}
asyncEventMon.clearMap = function(){
    util.logger.info(AgentSetting.currentTestRun, ' |  Clearing Async Event Monitor Map ');
    asyncDataModel.clearEventMap();
}
module.exports=asyncEventMon;
