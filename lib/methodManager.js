/**
 * Created by compass241 on 17-08-2015.
 */
    //Error.stackTraceLimit = Infinity;
var methodCall = require('./flowpath/methodCall').MethodCall;
var eventData = require('./flowpath/eventData').eventData;

//var Formatter = require('./njstrace/formatter.js');
//var njstrace = require('./njstrace/njsTrace');
var category = require('./category');
var path  = require('path');

var samples = require('./nodetime/lib/samples.js');
var ndMethodMetaData = require('./metaData/ndMethodMetaData');
var ndMethodMonitor = require('./method-monitor/ndMethodMonitor.js');
var asMonitorFile = require('./autoSensor/autoSensorMonitor');
var ndExceptionStats = require('./exception/ndExceptionStats');
var agentSetting = require("./agent-setting");
var btManager = require('./BT/btManager');
var asManagerFile = require('./autoSensor/autoSensorManager');
var asSettingObj = require('./autoSensor/autoSensorSetting');
var localStorage = require('./utils/continuation-local-storage')
var NDHttpReqRespCaptureSettings = require('./HttpHeader/NDHttpReqRespCaptureSettings');
var NDHttpCaptureSettings = require('./HttpHeader/NDHttpCaptureSettings');
var util = require("./util");

var asThreashold = asSettingObj.asSampleInterval*asSettingObj.asThresholdMatchCount;

// Create my custom Formatter class
function MyFormatter() {// No need to call Formatter ctor here

}

// But must "inherit" from Formatter
//require('util').inherits(MyFormatter, Formatter);

// Implement the onEntry method
MyFormatter.prototype.isReqToInstrument = function() {
    try{
        if(localStorage && localStorage.getNamespace('cavissonNamespace') && localStorage.getNamespace('cavissonNamespace').get('httpReq'))
            return localStorage.getNamespace('cavissonNamespace').get('httpReq').cavIncludeFp;
        else
            return false;
    }
    catch(e)
    {
        util.logger.warn("Error in checking ,is current req to be instrument : ",e)
        return false;
    }
}

MyFormatter.prototype.onEntry = function(args) {
    var context;
    //Getting cavisson namespace that have httpReq object.
    var flowpath=agentSetting.isToInstrument && (context= agentSetting.getContextObj()) && context.cavFlowPathId && agentSetting.flowMap[context.cavFlowPathId]
    if(!flowpath)return args.cavIncludeFp = false;

    if(!args.isFirstOrlastMethod) {
        if (context.cavIncludeFp)
            args.cavIncludeFp = true
        else
            return args.cavIncludeFp = false
    }

    ++context.seqId;  //Incrementing seqID, at entry of every method, it will incremented and at end of FP it will be reinitialized

    var methodId;

    methodId=  ndMethodMetaData.getValue(args.methodName,args);
    if(!methodId)return;
    var startUpTime = new Date().getTime();
    args.methObj = new methodCall (methodId,'_0_',startUpTime-context.fpTimeWithoutCavepoch);          //Creating Obj for every method entry
    args.flowPathObj=flowpath;

    flowpath.nonServiceMethodDepth = ++flowpath.nonServiceMethodDepth;
    if(flowpath.nonServiceMethodDepth > agentSetting.bciMaxNonServiceMethodsPerFP) {
        if (!flowpath.isNonServiceMethodDepthExceeds){
            flowpath.isNonServiceMethodDepthExceeds = true
            util.logger.error(agentSetting.currentTestRun, '| Not dumping method entry record for methodId : ', methodId, 'because nonServiceMethodDepthis ',
                flowpath.nonServiceMethodDepth, ' is greater then', agentSetting.bciMaxNonServiceMethodsPerFP, '.FPID is :', flowpath.flowPathId);
        }
        return;
    }

    if (agentSetting.corelateEventCallback >0 ) {
        var eventInfo, delay,argsName,last_arg,eventName,headerId;
        if(global.cavisson_event_callback_releation_data) {
            last_arg = global.cavisson_event_callback_releation_data;
            global.cavisson_event_callback_releation_data = undefined
        }
        eventName = args.eventName;
        if(last_arg) {
            eventInfo = last_arg.split(':')
            delay = startUpTime - eventInfo[1]
            argsName = eventInfo[0] + ' - ' + delay;

            headerId = NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord('asyncEvent')               //to do dump 6 record
            args.methObj.seqId = context.seqId
            flowpath.eventArray.push(new eventData(methodId,context.seqId,headerId,argsName))
            if (flowpath.eventArray.length >= 100) {
                var encoded_19 = flowpath.dumpMethodArgs()
                if(encoded_19)samples.add(encoded_19);
            }
        }
        else if(eventName) {
            argsName = 'Event- ' + eventName
            args.parentId = context.seqId;

            headerId = NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord('asyncEvent')               //to do dump 6 record
            args.methObj.seqId = context.seqId
            flowpath.eventArray.push(new eventData(methodId,context.seqId,headerId,argsName))
            /*If 100 event areguments are dumped then we will dump 19 record , because NDC will accept
            maximum string size of 13k bytes so we are expecting that in 100 arguments we will reach the threashold
            */
            if (flowpath.eventArray.length >= 100) {
                var encoded_19 = flowpath.dumpMethodArgs()
                if(encoded_19)samples.add(encoded_19);
            }
        }
    }

    flowpath.calls.push(args.methObj);
    if (flowpath.calls.length >= agentSetting.maxCharInSeqBlob) {
        if (!flowpath.flowpathHdrDump) {
            var encoded2_record = flowpath.generate_2_record();
            samples.add(encoded2_record);
            flowpath.flowpathHdrDump = true;
        }
        var encoded3_record = flowpath.generate_3_record();
        samples.add(encoded3_record);
        flowpath.fp3RecordDump = true;
    }
};

MyFormatter.prototype.onCatchClause = function(args) {
    if(agentSetting.isToInstrument)
        ndExceptionStats.dumpExceptionRecord(args);
};

function  getRequestObjectFromStackMap(stackMap) {
    var keys = Object.keys(stackMap);

    for(var i = 0; i < keys.length; i++) {
        var requestedArgument = util.checkArguments(stackMap[keys[i]].stackArgs, "IncomingMessage")
        if(requestedArgument)
            return requestedArgument;
    }
}

function getResponseObject(functionArguments)
{
    if(functionArguments == null)
        return null;
    else if(functionArguments.callee.caller == null)
        return null;

    var requestedArgument = util.checkArguments(functionArguments, "ServerResponse");
    if(requestedArgument)
        return requestedArgument;
    else
        return  getResponseObject(functionArguments.callee.caller.arguments);
}

MyFormatter.prototype.onCompleteFlowPath = function(req,res,context) {
    if (!req)return;
    var endTime = new Date().getTime();
    if (!context) return;
    var localFlowPathId = -1,reqSize=0,resSize=0;
    localFlowPathId = context.cavFlowPathId;
    var flowpath = agentSetting.flowMap[localFlowPathId];
    if (!flowpath)
        return;
    context.seqId = 0;
    var btObj = context.cavBtObj;
    if (flowpath.errorStatusCode)
        flowpath.statusCode = flowpath.errorStatusCode;
    else
        flowpath.statusCode = res.statusCode;
    if(req["headers"])
        reqSize = req["headers"]["content-length"];
    if(res["_headers"])
        resSize = res["_headers"]["content-length"];

    context['cavFlowPathId'] = null;
    if (agentSetting.isToInstrument && agentSetting.dataConnHandler) {
        try {
            process.nextTick(function () {
                try {
                    var respTime = (endTime - agentSetting.cavEpochDiffInMills) - context.cavTimeInMillis;
                    var bt_Data = btManager.getBTData(btObj.btId);
                    flowpath.respTime = respTime;
                    flowpath.category = category.getCategory(flowpath.statusCode, respTime, btObj.threshold, btObj.threshold.dynamicSlowThresold, btObj.threshold.dynamicVSlowThresold);// this function responsible for calculate slow and vslow flowpaths on basis of threshold values
                    btManager.createAndUpdateBTRecord(btObj.btId, btObj.btName, respTime, flowpath.category, flowpath.statusCode,btObj.threshold.dynamicSlowThresold, btObj.threshold.dynamicVSlowThresold, reqSize,resSize);

                    if (context.cavIncludeFp || (!(context.cavIncludeFp) && flowpath.category > 10) || flowpath.dumpForcefullL1FP) {
                        NDHttpCaptureSettings.dumpHttpReqResHeader(req, res, flowpath)
                        var encoded_19 = flowpath.dumpMethodArgs()
                        if(encoded_19)samples.add(encoded_19);
                        if (flowpath.calls.length) {
                            if (!flowpath.flowpathHdrDump) {
                                var encoded2_record = flowpath.generate_2_record();
                                samples.add(encoded2_record);
                            }
                            var encoded4_record = flowpath.generate_4_record();
                            samples.add(encoded4_record);
                        }
                        else {
                            if (flowpath.flowpathHdrDump) {
                                var encoded4_record = flowpath.generate_4_record();
                                samples.add(encoded4_record);
                            }
                        }
                    }
                    else if (!(context.cavIncludeFp) && flowpath.fp3RecordDump && flowpath.category == 10) {
                        flowpath.statusCode = -99;
                        var encoded4_record = flowpath.generate_4_record();
                        samples.add(encoded4_record);
                    }
                    delete agentSetting.flowMap[localFlowPathId];
                }
                catch (err) {
                    util.logger.warn(err);
                }
            });
        } catch (err) {
            util.logger.warn(err);
        }
    }
}

// Implement the onExit method
MyFormatter.prototype.onExit = function(args) {
    var flowPathObj = args.flowPathObj;
    if(!agentSetting.isToInstrument || !flowPathObj) return;
    if(!args.methObj) return;

    var endTime = ((new Date().getTime() -  flowPathObj.fpTimeWithoutCavepoch) - args.methObj.startUpTime );
    var exitMethodObj = new methodCall(args.methObj.methodId,'_1_',endTime);
    var threadID = flowPathObj.threadID;

    /*
     * Dumping AS data
     * Checking method duration(endTime) with AS Threshold Value
     * Args:stackTrace,endTime(duration),fpId,methodId,threadId,currentTime relative to cavEpochDiff.
     */
    if(asSettingObj.asSampleInterval > 0 ) {

        if (endTime > asSettingObj.threshold) {
            var stackTrace = asManagerFile.stackTrace();  //Getting Stack Trace for particular method.
            process.nextTick(function () {
                try {
                    if(asSettingObj.ASTraceLevel > 0)
                        util.logger.info(agentSetting.currentTestRun,' | Handling hotspot for methodId :',exitMethodObj.methodId)
                    asManagerFile.handledHotspotData(stackTrace, endTime, (+args.methObj.startUpTime +  +flowPathObj.timeInMillis) ,
                        flowPathObj.cavCurrReqFPID,
                        exitMethodObj.methodId, threadID, (new Date().getTime() - agentSetting.cavEpochDiffInMills));
                }
                catch (err) {
                    util.logger.warn("Getting Error in AS :-  " + err);
                }
            });
        }

    }
    if (!args.isFirstOrlastMethod && !args.methObj.isDumped && Number(endTime) < agentSetting.excludeMethodOnRespTime) {
        args.methObj.exclude = true;
        //
        --flowPathObj.nonServiceMethodDepth;
        return;
    }
    if(flowPathObj.nonServiceMethodDepth > agentSetting.bciMaxNonServiceMethodsPerFP) {
        if (!flowPathObj.isNonServiceMethodDepthExceeds) {
            flowPathObj.isNonServiceMethodDepthExceeds = true;
            util.logger.error(agentSetting.currentTestRun, '| Not dumping method exit record for methodId : ', exitMethodObj.methodId, 'because nonServiceMethodDepthis ',
                flowPathObj.nonServiceMethodDepth, ' is greater then', agentSetting.bciMaxNonServiceMethodsPerFP, '.FPID is :', flowPathObj.flowPathId);
        }
        flowPathObj.nonServiceMethodDepth = --flowPathObj.nonServiceMethodDepth;
        return;
    }
    flowPathObj.calls.push(exitMethodObj);

    //var mthName = ndMethodMetaData.getMethodMonitorName(exitMethodObj.methodId);
    var aliasName = ndMethodMonitor.isMethodInCurrentMonitoringList(args.dumpedMethodName);
    if (aliasName) {
        process.nextTick(function () {
            try {
                ndMethodMonitor.updateMMCounters(args.dumpedMethodName, exitMethodObj.methodId, endTime, aliasName)
            } catch (err) {
                util.logger.warn(err)
            }
        });
    }
    if (flowPathObj.calls.length >= agentSetting.maxCharInSeqBlob) {
        if (!flowPathObj.flowpathHdrDump) {
            var encoded2_record = flowPathObj.generate_2_record();
            samples.add(encoded2_record);
            flowPathObj.flowpathHdrDump = true;
        }
        var encoded3_record = flowPathObj.generate_3_record();
        samples.add(encoded3_record);
        flowPathObj.fp3RecordDump = true;
    }
};

module.exports = new MyFormatter();
