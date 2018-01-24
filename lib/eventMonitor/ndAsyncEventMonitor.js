/**
 * Created by Harendra on 6/27/2017.
 */


var asyncDataModel = require('./ndAsyncEventDataModel'),
    asyncEventData = require('./ndAsyncEventData'),
    util = require('./../util'),
    AgentSetting = require("./../agent-setting"),
    samples = require('../nodetime/lib/samples'),
    compareVersion = require('../utils/compare-verssions'),
    asSettingObj = require('./../autoSensor/autoSensorSetting'),
    asManagerFile = require('./../autoSensor/autoSensorManager');

var asyncWrap,enableAsyncHooks=false,asyncHook;

// global state variable, that contains the stack traces and the current uid

var stack = {};
stack['-1'] = [];
var currentUid = -1;

try {
    asyncWrap = compareVersion(process.version, '6.0.0') < 0 ? console.log("*** Error in requiring async_wrap in ndAsyncEventMonitor file because node version is less than 6.0.0 *** "):compareVersion(process.version, '8.0.0') === -1? process.binding('async_wrap') : enableAsyncHooks=true;
    if(enableAsyncHooks)
        asyncWrap =require('async_hooks');
}catch(e){
    asyncWrap=undefined;
    console.log("*** Error in requiring async_wrap in ndAsyncEventMonitor file  *** ");
}

var eventIdNameMap = new Map();                                  //Creating local map for all events because same events comes with different ids.
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
        util.logger.info(AgentSetting.currentTestRun, '| AsyncEventMonitor has been started...');
        //Creating global map (KEY:provide's Id and VALUE:Object of asyncEventData) for all asynchronous events
        var eventCount = 0, avgTime = 0, minTime = Number.MAX_VALUE, maxTime = 0, timeDelay = 0, executionTime = 0, minDelay=Number.MAX_VALUE, maxDelay=0;
        if (enableAsyncHooks) {
            /*const localMap={"CRYPTO":"1","FSEVENTWRAP":"2","FSREQWRAP":"3","GETADDRINFOREQWRAP":"4","GETNAMEINFOREQWRAP":"5","HTTPPARSER":"6","JSSTREAM":"7","PIPEWRAP":"8",
                "PIPECONNECTWRAP":"9","PROCESSWRAP":"10","QUERYWRAP":"11","SHUTDOWNWRAP":"12","SIGNALWRAP":"13","STATWATCHER":"14","TCPWRAP":"15","TCPCONNECTWRAP":"16",
                "TLSWRAP":"18","TTYWRAP":"19","UDPWRAP":"20","UDPSENDWRAP":"21","WRITEWRAP":"22","ZLIB":"23","SSLCONNECTION":"24","PBKDF2REQUEST":"25","RANDOMBYTESREQUEST":"26",
                "Immediate":"28","TickObject":"29", "TCPSERVER":"30"};*/
            const localMap={"CRYPTO":"1","FSEVENTWRAP":"2","FSREQWRAP":"3","GETADDRINFOREQWRAP":"4","GETNAMEINFOREQWRAP":"5","HTTPPARSER":"6","JSSTREAM":"7","PIPEWRAP":"8",
                "PIPECONNECTWRAP":"9","PROCESSWRAP":"10","QUERYWRAP":"11","SHUTDOWNWRAP":"12","SIGNALWRAP":"13","STATWATCHER":"14","TCPWRAP":"15","TCPCONNECTWRAP":"16",
                "TLSWRAP":"18","TTYWRAP":"19","UDPWRAP":"20","UDPSENDWRAP":"21","WRITEWRAP":"22","ZLIB":"23","SSLCONNECTION":"24","PBKDF2REQUEST":"25","RANDOMBYTESREQUEST":"26",
                "Timeout":"27","Immediate":"28","TickObject":"29","TCPSERVER":"30"};

            for (var key in localMap) {
                if(AgentSetting.filterHSEvents && AgentSetting.filterHSEvents.indexOf(key) != -1)
                    continue;
                asyncDataModel.insertEmitEventsIntoMap(key, localMap[key], eventCount, avgTime, minTime, maxTime, timeDelay, executionTime, minDelay, maxDelay);
            }
            asyncHook = asyncWrap.createHook({ init, before, after, destroy });
            asyncHook.enable();
        } else {
            for (var key in asyncWrap.Providers) {
                if(AgentSetting.filterHSEvents && AgentSetting.filterHSEvents.indexOf(key) != -1)
                    continue;
                asyncDataModel.insertEmitEventsIntoMap(asyncWrap.Providers[key], key, eventCount, avgTime, minTime, maxTime, timeDelay, executionTime, minDelay, maxDelay);
            }
            asyncWrap.setupHooks({init, pre, post, destroy});
            asyncWrap.enable();
        }
        asyncEventMon.startAsyncEventMonitor();
    }
    catch(e){
        util.logger.error(AgentSetting.currentTestRun + " |Error in start method of async event emitter  : " ,e);
    }
}

asyncEventMon.stop = function(){
    try {
        util.logger.info(AgentSetting.currentTestRun, ' | AsyncEventMonitor has been Stopped !!!');
        if(asyncWrap) {
            if(enableAsyncHooks && asyncHook)
                asyncHook.disable();
            else if(!enableAsyncHooks)
                asyncWrap.disable();
        }
        asyncEventMon.stopAsyncEventMonitor();
        asyncDataModel.clearEventMap();
        eventIdNameMap.clear()
    }
    catch(e){
        util.logger.error(AgentSetting.currentTestRun + " |Error in stop method of async event emitter  : " ,e);
    }

}

var eventObj= {startTime : 0,provider : 0,timeDelay : 0,fpId : "-1",parentUid : 0,
    executionTime : 0,stack:undefined, parent:undefined};


function init(uid, provider, parentUid, parentHandle) {
    // When a handle is created, collect the stack trace such that we later
    // can see what involved the handle constructor.
    // Compute the full stack and store on the `Map` using the `uid` as key.
    try {
        var eventMatchInMap = asyncDataModel.asyncEventDataMap[provider];
        if (eventMatchInMap) {

            eventMatchInMap.eventCount++;
            eventMatchInMap.isDataDump = true;

            var current = Object.create(eventObj);
            current.startTime = new Date().getTime();
            current.provider=provider;
            current.parentUid=parentUid;

            if (AgentSetting.enableHSLongStack > 0) {
                var contextFPId = AgentSetting.getContextObj();
                if (contextFPId)
                    current.fpId = contextFPId.cavCurrReqFPID;

                if (AgentSetting.enableHSLongStack == 2) {
                    current.stack = (new Error()).stack;
                    current.parent = eventIdNameMap.get(parentUid) || eventIdNameMap.get(currentUid);
                }
            }
            eventIdNameMap.set(uid,current);
        }
    } catch(ex){}
}


function pre(uid) {
    // A callback is about to be called, update the `currentUid` such that
    // it is correct for when another handle is initialized or `getStack` is
    // called.
    try {
        var event = eventIdNameMap.get(uid);
        if (event) {
            var date = new Date().getTime();
            var delay = date - Number(event.startTime);
            event.timeDelay = delay;
            event.startTime = date;
            var updateMap = asyncDataModel.asyncEventDataMap[event.provider];
            asyncDataModel.updateAsyncEventDelay(updateMap, delay);
            currentUid = uid;
            if (AgentSetting.enableHSLongStack > 0) {
                var requestedObj = AgentSetting.getContextObj();
                if (!requestedObj) {
                    return;
                }
                event.fpId = requestedObj.cavCurrReqFPID;
                if (delay > asSettingObj.threshold && event.fpId != -1) {
                    generateHS(event, delay, function (obj, time, startTime, fpId, pid, currTime) {
                        asManagerFile.handledHotspotData(obj, time, startTime, fpId, "LongStack", pid, currTime);
                    })
                }
            }
        }
    }catch(ex) {}
}
function post(uid, didThrow) {
    // At the time of writing there are some odd cases where there is no handle
    // context, this line prevents that from resulting in wrong stack trace. But
    // the stack trace will be shorter compared to what ideally should happen.
    try {
        var event = eventIdNameMap.get(uid);
        if (event) {
            var executionTime = new Date().getTime() - event.startTime;
            event.executionTime = executionTime;
            var updateMap = asyncDataModel.asyncEventDataMap[event.provider];
            asyncDataModel.updateAsyncEventExecTime(updateMap, executionTime);
            currentUid = -1;
            if (AgentSetting.enableHSLongStack > 0 && executionTime > asSettingObj.threshold && event.fpId != -1) {
                generateHS(event, executionTime, function (obj, time, startTime, fpId, pid, currTime) {
                    asManagerFile.handledHotspotData(obj, time, startTime, fpId, "LongStack", pid, currTime);
                })
            }
        }
    }catch(ex) {}
}

function before(uid){
    try {
        var event=eventIdNameMap.get(uid);
        if (event) {
            var date = new Date().getTime();
            var delay = date - Number(event.startTime);
            event.timeDelay = delay;
            event.startTime = date;
            var updateMap = asyncDataModel.asyncEventDataMap[event.provider];
            asyncDataModel.updateAsyncEventDelay(updateMap, delay);
            currentUid = uid;
            if (AgentSetting.enableHSLongStack > 0) {
                var requestedObj = AgentSetting.getContextObj();
                if (!requestedObj) {
                    return;
                }
                event.fpId = requestedObj.cavCurrReqFPID;
                if(delay > asSettingObj.threshold && event.fpId != -1){
                    generateHS(event, delay, function (obj, time, startTime, fpId, pid, currTime) {
                        asManagerFile.handledHotspotData(obj, time, startTime, fpId, "LongStack", pid, currTime);
                    });
                }
            }
        }
    }
    catch(ex) {}
}
// after is called just after the resource's callback has finished.
function after(uid) {
    try {
        var event=eventIdNameMap.get(uid);
        if (event) {
            var executionTime = new Date().getTime() - event.startTime;
            event.executionTime = executionTime;
            var updateMap = asyncDataModel.asyncEventDataMap[event.provider];
            asyncDataModel.updateAsyncEventExecTime(updateMap, executionTime);
            if (AgentSetting.enableHSLongStack > 0 && executionTime > asSettingObj.threshold && event.fpId != -1) {
                generateHS(event, executionTime, function (obj, time, startTime, fpId, pid, currTime) {
                    asManagerFile.handledHotspotData(obj, time, startTime, fpId, "LongStack", pid, currTime);
                });
            }
            currentUid = -1;
        }
    }
    catch(ex) {}
}

function destroy(uid) {
    try {
        // Once the handle is destroyed no other handle objects can be created with
        // this handle as its immediate context. Thus its associated stack can be deleted.
        eventIdNameMap.delete(uid);
        if(eventIdNameMap.size > 5000)
            eventIdNameMap.clear()
    } catch(ex) {}
}

function generateHS(event,time,cb){
    event.lastStack= (new Error()).stack;
    var obj = event
    process.nextTick(function(){
        cb(obj, time, event.startTime - AgentSetting.cavEpochDiffInMills, event.fpId, process.pid, (new Date().getTime() - AgentSetting.cavEpochDiffInMills))
    })
}

asyncEventMon.asyncEventTimer=undefined;
asyncEventMon.startAsyncEventMonitor = function(){
        if (AgentSetting.autoSensorConnHandler && AgentSetting.autoSensorConnHandler.client){
            if(asyncEventMon.asyncEventTimer === undefined)
                asyncEventMon.asyncEventTimer = setInterval(asyncEventMon.dumpAsyncEventData, AgentSetting.ndMonitorInterval);
        }
}

asyncEventMon.dumpAsyncEventData = function(){
    try {
       // var eventDataMap = asyncDataModel.getEventDataMap();
        for (var i in asyncDataModel.asyncEventDataMap) {
            var events = asyncDataModel.asyncEventDataMap[i];
            if (events && events.isDataDump) {
                var data = asyncEventMon.create87Record(i, events)+'\n';
                events.reset();
                samples.toBuffer(data);
                if(AgentSetting.enableBciDebug > 5)
                    util.logger.warn(AgentSetting.currentTestRun + " |Dumping AsyncMonitor Record  : " ,data);
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
    asyncEventData += (enableAsyncHooks)?value.eventName:id;
    asyncEventData += ':';
    asyncEventData += AgentSetting.vectorPrefix;
    asyncEventData += (enableAsyncHooks)?id:value.eventName;
    asyncEventData += '|';
    asyncEventData += (value.eventCount > 0) ?((Number(value.eventCount)/ Number(AgentSetting.ndMonitorInterval / 1000))).toFixed(3):value.eventCount;
    asyncEventData += ' ';
    asyncEventData += (value.totExecutionTime > 0) ? (Number(value.totExecutionTime)/Number(value.eventCount)).toFixed(3) : value.totExecutionTime;
    asyncEventData += ' ';
    asyncEventData += (value.eventCount > 0)?value.minTime:0;
    asyncEventData += ' ';
    asyncEventData += value.maxTime;
    asyncEventData += ' ';
    asyncEventData += value.eventCount;
    asyncEventData += ' ';
    asyncEventData += (value.timeDelay > 0) ? (Number(value.timeDelay)/Number(value.eventCount)).toFixed(3) : value.timeDelay;
    asyncEventData += ' ';
    asyncEventData += (value.eventCount > 0)?value.minDelay:0;
    asyncEventData += ' ';
    asyncEventData += value.maxDelay;
    asyncEventData += ' ';
    asyncEventData += value.eventCount;
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
