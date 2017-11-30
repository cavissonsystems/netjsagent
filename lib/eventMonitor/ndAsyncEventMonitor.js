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
let currentUid = -1;

try {
    asyncWrap = compareVersion(process.version, '6.0.0') < 0 ? console.log("*** Error in requiring async_wrap in ndAsyncEventMonitor file because node version is less than 6.0.0 *** "):compareVersion(process.version, '8.0.0') === -1? process.binding('async_wrap') : enableAsyncHooks=true;
    if(enableAsyncHooks)
        asyncWrap =require('async_hooks');
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
        util.logger.info(AgentSetting.currentTestRun, '| AsyncEventMonitor has been started...');
        //Creating global map (KEY:provide's Id and VALUE:Object of asyncEventData) for all asynchronous events
        var eventCount = 0, avgTime = 0, minTime = 0, maxTime = 0, timeDelay = 0, executionTime = 0;
        if (enableAsyncHooks) {
            const localMap={"NONE":"0","CRYPTO":"1","FSEVENTWRAP":"2","FSREQWRAP":"3","GETADDRINFOREQWRAP":"4","GETNAMEINFOREQWRAP":"5","HTTPPARSER":"6","JSSTREAM":"7","PIPEWRAP":"8",
                "PIPECONNECTWRAP":"9","PROCESSWRAP":"10","QUERYWRAP":"11","SHUTDOWNWRAP":"12","SIGNALWRAP":"13","STATWATCHER":"14","TCPWRAP":"15","TCPCONNECTWRAP":"16","TIMERWRAP":"17",
                "TLSWRAP":"18","TTYWRAP":"19","UDPWRAP":"20","UDPSENDWRAP":"21","UDPSENDWRAP":"22","ZLIB":"23","SSLCONNECTION":"24","PBKDF2REQUEST":"25","RANDOMBYTESREQUEST":"26",
                "Timeout":"27","Immediate":"28","TickObject":"29"};
            for (var key in localMap) {
                asyncDataModel.insertEmitEventsIntoMap(key, localMap[key], eventCount, avgTime, minTime, maxTime, timeDelay, executionTime);
            }
            asyncHook = asyncWrap.createHook({ init, before, after, destroy });
            asyncHook.enable();

        } else {
            for (var key in asyncWrap.Providers) {
                asyncDataModel.insertEmitEventsIntoMap(asyncWrap.Providers[key], key, eventCount, avgTime, minTime, maxTime, timeDelay, executionTime);
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
    temp.fpId=-1;
    eventIdNameMap[uid]=temp;
    if(AgentSetting.enableHSLongStack) {
        const localStack = (new Error()).stack.split("\n");
        const extraStack = stack[parentUid || currentUid];
        // Compute the full stack and store on the `Map` using the `uid` as key.
        stack[uid] = (extraStack) ? (localStack.concat(extraStack).length > 500 ? localStack.concat(extraStack).splice(0,localStack.concat(extraStack).length - 300):localStack.concat(extraStack)): localStack;//eventIdNameMap[uid].stackArr;//localStack + '\n' + extraStack;
    }


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
    currentUid = uid;
    if (AgentSetting.enableHSLongStack && delay > asSettingObj.threshold) {
        var requestedObj=AgentSetting.getFlowPathIdFromRequest();
        if(!requestedObj) {
            return;
        }
        if(requestedObj.cavFlowPathId)
            eventIdNameMap[uid].fpId = requestedObj.cavFlowPathId;
        else if(requestedObj.cavHsFlowPathId)
            eventIdNameMap[uid].fpId=requestedObj.cavHsFlowPathId;

        if (eventIdNameMap[uid].fpId.indexOf(":") != -1)                 //Getting only current fpid, not with parent id .
            eventIdNameMap[uid].fpId = eventIdNameMap[uid].fpId.split(":")[0];

        asManagerFile.handledHotspotData(getStack("", uid), delay, eventIdNameMap[uid].startTime, eventIdNameMap[uid].fpId, "LongStack", process.pid, (date - AgentSetting.cavEpochDiffInMills));
    }
}
function post(uid, didThrow) {
    // At the time of writing there are some odd cases where there is no handle
    // context, this line prevents that from resulting in wrong stack trace. But
    // the stack trace will be shorter compared to what ideally should happen.
    var executionTime = new Date().getTime() - eventIdNameMap[uid].startTime;
    eventIdNameMap[uid].executionTime = executionTime;
    asyncDataModel.updateAsyncEventExecTime(eventIdNameMap[uid].provider,executionTime);
    currentUid = -1;
    if (AgentSetting.enableHSLongStack && executionTime > asSettingObj.threshold) {
        asManagerFile.handledHotspotData(getStack("", uid), executionTime, eventIdNameMap[uid].startTime, eventIdNameMap[uid].fpId, "LongStack", process.pid, (new Date().getTime() - AgentSetting.cavEpochDiffInMills));
    }

}

function before(uid){
    if(eventIdNameMap[uid]){
        var date=new Date().getTime();
        var delay = date - Number(eventIdNameMap[uid].startTime);
        eventIdNameMap[uid].timeDelay = delay;
        eventIdNameMap[uid].startTime = date;
        asyncDataModel.updateAsyncEventDelay(eventIdNameMap[uid].provider,delay);
        currentUid = uid;
        if (AgentSetting.enableHSLongStack && delay > asSettingObj.threshold) {
            var requestedObj=AgentSetting.getFlowPathIdFromRequest();
            if(!requestedObj) {
                return;
            }
            if(requestedObj.cavFlowPathId)
                eventIdNameMap[uid].fpId = requestedObj.cavFlowPathId;
            else if(requestedObj.cavHsFlowPathId)
                eventIdNameMap[uid].fpId=requestedObj.cavHsFlowPathId;

            if (eventIdNameMap[uid].fpId.indexOf(":") != -1)                 //Getting only current fpid, not with parent id .
                eventIdNameMap[uid].fpId = eventIdNameMap[uid].fpId.split(":")[0];

            asManagerFile.handledHotspotData(getStack("", uid), delay, eventIdNameMap[uid].startTime, eventIdNameMap[uid].fpId, "LongStack", process.pid, (date - AgentSetting.cavEpochDiffInMills));
        }

    }else{
        //il.logger.info(AgentSetting.currentTestRun, '| Pre Id which is not mapped ',uid);
    }
}
// after is called just after the resource's callback has finished.
function after(uid) {
    if(eventIdNameMap[uid]){
        var executionTime = new Date().getTime() - eventIdNameMap[uid].startTime;
        eventIdNameMap[uid].executionTime = executionTime;
        asyncDataModel.updateAsyncEventExecTime(eventIdNameMap[uid].provider,executionTime);
        currentUid = -1;
        if (AgentSetting.enableHSLongStack && executionTime > asSettingObj.threshold) {
            asManagerFile.handledHotspotData(getStack("", uid), executionTime, eventIdNameMap[uid].startTime, eventIdNameMap[uid].fpId, "LongStack", process.pid, (new Date().getTime() - AgentSetting.cavEpochDiffInMills));
        }
    }else{
        //util.logger.info(AgentSetting.currentTestRun, '| ***********Post Id which is not mapped ********** ',uid);
    }
}

function destroy(uid) {
    // Once the handle is destroyed no other handle objects can be created with
    // this handle as its immediate context. Thus its associated stack can be deleted.
    delete stack[uid];
    delete eventIdNameMap[uid];

    if(Object.keys(stack).length > 5000) {
        var diff = Object.keys(stack).length - 2000;
        var counter = 0;
        for(var kt in stack){
            delete stack[kt];
            counter++;
            if(counter == diff)
                break;
        }
    }
}

function getStack(message, currentUid) {
    const localStack = (new Error(message).stack.split("\n")).concat(stack[currentUid]);
    return (localStack.length > 500)?(new Error(message).stack.split("\n")):(localStack);
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
    asyncEventData += (enableAsyncHooks)?value.eventName:id;
    asyncEventData += ':';
    asyncEventData += AgentSetting.vectorPrefix;
    asyncEventData += (enableAsyncHooks)?id:value.eventName;
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
