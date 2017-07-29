/**
 * Created by Harendra Kumar on 10/7/2016.
 */
Error.stackTraceLimit = Infinity;
var asModel = require('./autoSensorDataModel');
var asMonitor = require('./autoSensorMonitor');
var asSetting = require('./autoSensorSetting');
var agentSetting = require("../agent-setting");
var util = require("../util");
//if (!process.addAsyncListener) require('async-listener');
var listener;

function ASManager(){
}

ASManager.threadSummaryTimer=undefined;
//Start AS monitor for dumping 53 record, set interval for sending record .
ASManager.startMonitor = function () {
    try {
	    if(agentSetting.agentMode >= 2){
        	if(ASManager.threadSummaryTimer===undefined)
		        ASManager.threadSummaryTimer = setInterval(asMonitor.sendThreadSummaryReport, asSetting.asReportInterval);
	    }
        else
            ASManager.stopMonitor();
    }
    catch(err) {
        util.logger.warn("Error occur in Dumping 53 record after particular interval : "+err);
    }
}

ASManager.generateHotSpot=function (duration,start) {

    try {
        var self = ASManager;
        var stackTrace = self.stackTrace();
        var getNamespace = require('../utils/continuation-local-storage').getNamespace,
            namespace = getNamespace('cavissonNamespace');
        var requestedObj = namespace.get('httpReq');
        var flowPathId;
        if (requestedObj && requestedObj['cavFlowPathId']) {
            flowPathId = requestedObj['cavFlowPathId'];
        }
        process.nextTick(function () {
            try {
                console.log("********** going to dump AS data ***********");
                self.handledHotspotData(stackTrace, duration, start,
                    flowPathId,
                    0, 0, (new Date().getTime() - asSetting.cavEpochDiffInMills));
            }
            catch (err) {
                console.log("Getting Error in AS :-  " + err);
            }
        }, 0);
    }
    catch (err)
    {
        console.log("Error in HS "+err);
    }
}

//Stopping AS monitor and clearing interval.
ASManager.stopMonitor= function (){
    try{
        clearInterval(ASManager.threadSummaryTimer);
        ASManager.threadSummaryTimer=undefined;
    }
    catch(err)
    {
        console.log("Error in stoping interval "+err);
    }
}

/*
 *  This Function handle HotSpot dumping flow coming from MethodManager file on exitFunction of every method , 52 record dumpped for each hotspot
 */
ASManager.handledHotspotData = function (stack,duration,hsStartTime,flowpathId,methodId,threadID,startTime) {

    try {
		if(asSetting.ASTraceLevel > 0)
		util.logger.info(agentSetting.currentTestRun,' | Updating Duration for Method ID : ',methodId)			   
	    asModel.setHotSpotDuration(duration, true); //This function updating counter and time for every thread.
        asMonitor.sendHotSpotRecord(stack, duration, hsStartTime, flowpathId, methodId, threadID, startTime);//Dumping hotspot record ,52 record
    }
    catch (err)
    {
        util.logger.warn("Error occur in Dumping 52 record  : "+err);
    }
}


//This Function used to capturing stackTrace of particular method. TODOtask: Capturing Full Stack Trace End to End flow
ASManager.stackTrace = function() {

    try {
        var err = new Error();
        Error.captureStackTrace(err);

        if (err.stack) {
            var lines = err.stack.split("\n");
            lines.shift();
            lines = lines.filter(function (line) {
                return (!line.match(/netjsagent/));;
                //return line;
            });

            return lines;
        }

        return undefined;
    }
    catch (err)
    {
        util.logger.warn("Error occur in gettinf StackTrace : "+err);
    }
};

var UNKNOWN_FUNCTION = '<unknown>';
  /**
 * This parses the different stack traces and puts them into one format
 * This borrows heavily from TraceKit (https://github.com/occ/TraceKit)
 */
  ASManager.parseStackTrace = function(stackString) {
    var chrome = /^\s*at (?:(?:(?:Anonymous function)?|((?:\[object object\])?\S+(?: \[as \S+\])?)) )?\(?((?:file|http|https):.*?):(\d+)(?::(\d+))?\)?\s*$/i,
        gecko = /^(?:\s*([^@]*)(?:\((.*?)\))?@)?(\S.*?):(\d+)(?::(\d+))?\s*$/i,
        node  = /^\s*at (?:((?:\[object object\])?\S+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i,
        lines = stackString.split('\n'),
        stack = [],
        parts,
        element;

    for (var i = 0, j = lines.length; i < j; ++i) {
        if ((parts = gecko.exec(lines[i]))) {
            element = {
                'file': parts[3],
                'methodName': parts[1] || UNKNOWN_FUNCTION,
                'lineNumber': +parts[4],
                'column': parts[5] ? +parts[5] : null
            };
        } else if ((parts = chrome.exec(lines[i]))) {
            element = {
                'file': parts[2],
                'methodName': parts[1] || UNKNOWN_FUNCTION,
                'lineNumber': +parts[3],
                'column': parts[4] ? +parts[4] : null
            };
        } else if ((parts = node.exec(lines[i]))) {
            element = {
                'file': parts[2],
                'methodName': parts[1] || UNKNOWN_FUNCTION,
                'lineNumber': +parts[3],
                'column': parts[4] ? +parts[4] : null
            };
        } else {
            continue;
        }

        stack.push(element);
    }

    return stack;
};
module.exports = ASManager;
