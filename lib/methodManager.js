/**
 * Created by compass241 on 17-08-2015.
 */
var methodCall = require('./flowpath/methodCall').MethodCall;

//var Formatter = require('./njstrace/formatter.js');
//var njstrace = require('./njstrace/njsTrace');
var category = require('./category');
var path  = require('path');
var url  = require('url');

var samples = require('./nodetime/lib/samples.js');
var btPatternRule = require('./BT/btPatternRule');
var ndMethodMetaData = require('./metaData/ndMethodMetaData');
var ndMethodMonitor = require('./method-monitor/ndMethodMonitor.js');
var asMonitorFile = require('./autoSensor/autoSensorMonitor');

//var methodMap = new Object();
var agentSetting = require("./agent-setting");
var flowMap;
var clientConn = require("./client");
//var btconf = require('./BT/btconfiguration');
var btManager = require('./BT/btManager');
var btrecord = require('./BT/BTRecord');
var asManagerFile = require('./autoSensor/autoSensorManager');
var asSettingObj = require('./autoSensor/autoSensorSetting');
var localStorage = require('./utils/continuation-local-storage')
var util = require("./util");
var newID = 0;
var newName ;
var firstmethodtimeId = '';
var p;
var onExitFlag = false;
var urlMap = new Object();
var cwd =  process.cwd().substring(process.cwd().lastIndexOf(path.sep)+1,process.cwd().length);

var asThreashold = asSettingObj.asSampleInterval*asSettingObj.asThresholdMatchCount;

// Create my custom Formatter class
function MyFormatter() {// No need to call Formatter ctor here

}

// But must "inherit" from Formatter
//require('util').inherits(MyFormatter, Formatter);

// Implement the onEntry method
MyFormatter.prototype.isReqToInstrument = function() {
    try{
        if(localStorage && localStorage.getNamespace('cavissonNamespace') && localStorage.getNamespace('cavissonNamespace').get('httpReq')){
            return localStorage.getNamespace('cavissonNamespace').get('httpReq').cavIncludeFp;
        }
        else
        {
            return false;
        }

    }
    catch(e)
    {
        console.log(e)
        return false;
    }
}

MyFormatter.prototype.onEntry = function(args) {
    if(!agentSetting.isTestRunning) {
        return;
    }

    try{
        //Getting cavisson namespace that have httpReq object.
        var namespace = localStorage.getNamespace('cavissonNamespace');

        var requestedObj=namespace.get('httpReq');
        if( !requestedObj || !requestedObj['flowPathId'] ) {
            return;
        }

        agentSetting.seqId = ++agentSetting.seqId;      //Incrementing seqID, at entry of every method, it will incremented and at end of FP it will be reinitialized

        var methodObj = new methodCall ();              //Creating Obj for every method entry

        var dirName = path.dirname(args.file);
        var baseName = path.basename(args.file, '.js');
        if (dirName == ".")
            dirName = cwd;

		var methodData = dirName + "." + baseName + '.' + args.name ;

        var  flowpath = agentSetting.flowMap[requestedObj['flowPathId']];
        if(!flowpath)
            return;

        args.methodId = methodObj.methodId =  ndMethodMetaData.getValue(methodData,args);
        methodObj.event =  '_0_' ;
        args.cavMthStartTime = methodObj.startUpTime = (new Date().getTime()-requestedObj.fpTimeWithoutCavepoch);
        args.flowPathObj=flowpath;

        flowpath.calls.push(methodObj);

        if (flowpath.calls.length >= agentSetting.maxCharInSeqBlob) {
            if (flowpath.flowpathHdrDump) {
                var encoded2_record = flowpath.generate_2_record();
                samples.add(encoded2_record);
                flowpath.flowpathHdrDump = true;
            }
            var encoded3_record = flowpath.generate_3_record();
            samples.add(encoded3_record);
            flowpath.fp3RecordDump = true;
            //args.flowPathObj.calls  = [];
        }
    }
    catch(err) {
        util.logger.warn(err);
    }
};


function  getRequestObjectFromStackMap(stackMap) {
    var keys = Object.keys(stackMap);

    for(var i = 0; i < keys.length; i++)
    {
        var requestedArgument = util.checkArguments(stackMap[keys[i]].stackArgs, "IncomingMessage")
        if(requestedArgument)
            return requestedArgument;
    }
}


function getResponseObject(functionArguments)
{
    if(functionArguments == null)
    {
        return null;
    }
    else if(functionArguments.callee.caller == null)
    {
        return null;
    }
    var requestedArgument = util.checkArguments(functionArguments, "ServerResponse");

    if(requestedArgument)
        return requestedArgument;
    else
        return  getResponseObject(functionArguments.callee.caller.arguments);
}

//Clearing mathod and url map when test run is starting agin
MyFormatter.prototype.clearMap = function()
{
   urlMap = new Object();
   newID = 0;
}

MyFormatter.prototype.onCompleteFlowPath = function(req,res,endTime) {

    if(!req || !req['flowPathId'])
        return;

    var localFlowPathId = -1;
    localFlowPathId = req['flowPathId'];
    var flowpath=agentSetting.flowMap[localFlowPathId];
    if(!flowpath)
        return ;

    agentSetting.seqId =0;
    var URL=req['originalUrl'];
    if(URL === undefined ){
        URL=req['url'];
    }

	var btObj = req.cavBtObj;
    flowpath.statusCode = res.statusCode;
    req['flowPathId'] = null;
    if (agentSetting.isToInstrument && agentSetting.dataConnHandler ) {
        try {
            process.nextTick(function(){
                try {

                    var respTime = (endTime-agentSetting.cavEpochDiffInMills)-req.timeInMillis;
                    flowpath.respTime = respTime ;
                    flowpath.category = category.getCategory(respTime,btObj.threshold);

                    btManager.createAndUpdateBTRecord(btObj.btId,btObj.btName,respTime,flowpath.category,flowpath.statusCode );

                    if(req.cavIncludeFp || (!(req.cavIncludeFp) && flowpath.category >10)){
                        if(flowpath.calls.length) {
                            try {
                                if(!flowpath.flowpathHdrDump) {
                                    var encoded2_record = flowpath.generate_2_record();
                                    samples.add(encoded2_record);
                                }
                                var encoded4_record = flowpath.generate_4_record();
                                samples.add(encoded4_record);


                            }
                            catch(err)
                            {
                                util.logger.warn(err);
                            }
                        }
                        else{
                            if(flowpath.flowpathHdrDump) {
                                var encoded4_record = flowpath.generate_4_record();
                                samples.add(encoded4_record);
                            }
                        }
                    }
                    else if(!(req.cavIncludeFp) && flowpath.fp3RecordDump && flowpath.category == 10){
                        flowpath.statusCode = -99;
                        var encoded4_record = flowpath.generate_4_record();
                        samples.add(encoded4_record);

                    }

                    delete agentSetting.flowMap[localFlowPathId];

                }
                catch(err)
                {
                    util.logger.warn(err);
                }

            });



        }catch(err){
            util.logger.warn(err);
        }

    }
}


// Implement the onExit method
MyFormatter.prototype.onExit = function(args)
{
    try {
        if(!agentSetting.isTestRunning) {
            return;
        }
        var methodObj = new methodCall();

        if(args.flowPathObj == undefined)
            return ;

        var endTime = ((new Date().getTime() -  args.flowPathObj.fpTimeWithoutCavepoch) - args.cavMthStartTime);

        methodObj.methodId = args.methodId ;
        methodObj.event = '_1_';
        methodObj.endTime = endTime;

        var threadID = args.flowPathObj.threadID;

        /*
         * Dumping AS data
         * Checking method duration(endTime) with AS Threshold Value
         * Args:stackTrace,endTime(duration),fpId,methodId,threadId,currentTime relative to cavEpochDiff.
         */
        if(asSettingObj.asSampleInterval > 0 ) {
            if (endTime > asSettingObj.asSampleInterval*asSettingObj.asThresholdMatchCount) {

                var stackTrace = asManagerFile.stackTrace();  //Getting Stack Trace for particular method.

                process.nextTick(function () {
                    try {
                        /*var cavMthStartTime = (new Date().getTime() - (asSettingObj.asSampleInterval*asSettingObj.asThresholdMatchCount))
                        var hsEndTime = 1 * asSettingObj.asSampleInterval ;       //CumMatchCount * asSettingObj.asSampleInterval

                        asManagerFile.handledHotspotData(stackTrace, hsEndTime, cavMthStartTime,
                            args.flowPathObj.flowPathId,
                            methodObj.methodId, threadID, (new Date().getTime() - agentSetting.cavEpochDiffInMills));*/

                        asManagerFile.handledHotspotData(stackTrace, endTime, (+args.cavMthStartTime +  +args.flowPathObj.timeInMillis) ,
                            args.flowPathObj.flowPathId,
                            methodObj.methodId, threadID, (new Date().getTime() - agentSetting.cavEpochDiffInMills));
                    }
                    catch (err) {
                        util.logger.warn("Getting Error in AS :-  " + err);
                    }
                }, 0);

            }
        }


        var mthName = ndMethodMetaData.getMethodMonitorName(methodObj.methodId);
        var aliasName = ndMethodMonitor.isMethodInCurrentMonitoringList(mthName);
        if (aliasName) {
            process.nextTick(function () {
                try {
                    ndMethodMonitor.updateMMCounters(mthName, methodObj.methodId, endTime, aliasName)
                } catch (err) {
                    util.logger.warn(err)
                }
            }, 0);
        }
        args.flowPathObj.calls.push(methodObj);
        if (args.flowPathObj.calls.length >= agentSetting.maxCharInSeqBlob) {
            if (!args.flowPathObj.flowpathHdrDump) {
                var encoded2_record = args.flowPathObj.generate_2_record();
                samples.add(encoded2_record);
                args.flowPathObj.flowpathHdrDump = true;
            }
            var encoded3_record = args.flowPathObj.generate_3_record();
            samples.add(encoded3_record);
            args.flowPathObj.fp3RecordDump = true;
            //args.flowPathObj.calls  = [];
        }
    }
     catch(err)
     {
         util.logger.warn(err);
     }
};

module.exports = new MyFormatter();
