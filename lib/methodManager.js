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
var ndBTMetaData = require('./metaData/ndBTMetaData');
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
var util = require("./util");
var newID = 0;
var newName ;
var firstmethodtimeId = '';
var p;
var onExitFlag = false;
var urlMap = new Object();
var cwd =  process.cwd().substring(process.cwd().lastIndexOf(path.sep)+1,process.cwd().length);
var btFile = path.join(path.resolve(__dirname),'/../../../ndBtRuleFile.txt');


// Create my custom Formatter class
function MyFormatter() {// No need to call Formatter ctor here

}


// But must "inherit" from Formatter
//require('util').inherits(MyFormatter, Formatter);


// Implement the onEntry method
MyFormatter.prototype.onEntry = function(args) {
    agentSetting.seqId = agentSetting.seqId + 1 ;

    try{
        var methodObj = new methodCall ();
        var getNamespace = require('continuation-local-storage').getNamespace,
            namespace = getNamespace('cavissonNamespace');

        if(agentSetting.isRequested == false) {
            return;
        }

        var dirName = path.dirname(args.file);
        var baseName = path.basename(args.file, '.js');

        if (dirName == ".")
            dirName = cwd;

		//var methodData = dirName + "." + baseName + '.' + args.name + '(' + functionArguments + ')_' + args.line;
		var methodData = dirName + "." + baseName + '.' + args.name ;

        if(!ndMethodMetaData.getValue(methodData))
		    ndMethodMetaData.set(methodData,args);


        var requestedObj=namespace.get('httpReq');

        if(requestedObj == undefined) {
			return;
        }
        if(requestedObj['flowPathId'] == null) {
            return;
        }
        var localFlowPathId = requestedObj['flowPathId'];

        var  flowpath = agentSetting.flowMap[localFlowPathId];

        if(flowpath == undefined)
            return;

        var current_time = new Date().getTime();
        var timeAccCav = current_time - (agentSetting.cavEpochDiff * 1000);
        var startUpTime = timeAccCav - requestedObj.timeInMillis;

        methodObj.methodId =  ndMethodMetaData.getValue(methodData);
        methodObj.event =  '_0_' ;
        methodObj.startUpTime =  startUpTime ;
        args.cavMthStartTime = startUpTime;

        /*if(flowpath.methodStartTime == undefined && flowpath.firstmethodid == undefined)
        {
            flowpath.firstmethodid = methodMap[methodData];
            flowpath.methodStartTime = startUpTime;
            agentSetting.flowMap[localFlowPathId]=flowpath;
        }*/
        flowpath.calls.push(methodObj);

    }
    catch(err) {
        util.logger.warn(err);
    }
};


function  getRequestObjectFromStackMap(stackMap)
{
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

MyFormatter.prototype.onCompleteFlowPath = function(req,res) {

    if(!req || !req['flowPathId'])
        return;

    var date = new Date();
    var resp_current_time = date.getTime();

    var respTimeAccCav = resp_current_time - (agentSetting.cavEpochDiff*1000);
    var respTime = respTimeAccCav - req.timeInMillis;
    var localFlowPathId = -1;

    localFlowPathId = req['flowPathId'];

    var flowpath=agentSetting.flowMap[localFlowPathId];

    agentSetting.seqId =0;

    flowpath.respTime = respTime ;

    var URL=req['originalUrl'];

    if(URL === undefined ){
        URL=req['url'];
    }

	var btObj = req.cavBtObj;
    flowpath.category = category.getCategory(respTime,btObj.threshold);

    flowpath.statusCode = res.statusCode;

    btManager.createAndUpdateBTRecord(btObj.btId,btObj.btName,respTime,flowpath.category,flowpath.statusCode );
    req['flowPathId'] = null;

    if (agentSetting.isToInstrument && agentSetting.dataConnHandler ) {
        try {
			if(!req.cavIncludeFp && cat == '10' ){
                delete agentSetting.flowMap[localFlowPathId];
                return;
            }
		
            process.nextTick(function(){
                try {

					var encoded2_record = flowpath.generate_2_record();
                    samples.add(encoded2_record);
                    var encoded4_record = flowpath.generate_4_record();
                    samples.add(encoded4_record);

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
        var methodObj = new methodCall ();

        var getNamespace = require('continuation-local-storage').getNamespace,
            namespace = getNamespace('cavissonNamespace');

        if(agentSetting.isRequested == false)
            return;

        var requestedObj=namespace.get('httpReq');

        if(requestedObj == undefined)
        {
            return;
        }

        var localFlowPathId = -1;
        if (requestedObj != null)
            localFlowPathId = requestedObj['flowPathId'];
        else
            return;

        if(requestedObj['flowPathId'] == null)
            return;


        var dirName = path.dirname(args.file);
        var baseName = path.basename(args.file, '.js');

        if (dirName == ".")
            dirName = cwd ;

        //var methodData = dirName + "." + baseName + '.' + args.name + '(' + functionArguments + ')_' + args.line;
        var methodData = dirName + "." + baseName + '.' + args.name ;

        var flowpath = agentSetting.flowMap[localFlowPathId];

        if(undefined == flowpath)
            return ;

        var current_time = new Date().getTime();
        var timeAccCav = current_time - (agentSetting.cavEpochDiff * 1000);
        var methodEndTime = timeAccCav - requestedObj.timeInMillis;
        var endTime = methodEndTime - args.cavMthStartTime;

        methodObj.methodId = ndMethodMetaData.getValue(methodData);
        methodObj.event = '_1_' ;
        methodObj.endTime = endTime ;

        var threadID = flowpath.threadID;
        /*process.nextTick(function () {
            if(endTime > asSettingObj.thresholdValue){
                asMonitorFile.handledHotspotData("",endTime,args.cavMthStartTime,methodObj.flowPathId,methodObj.methodId,threadID,timeAccCav);
            }
        },0)*/

        process.nextTick(function(){
            try {
                var mthName = ndMethodMetaData.getMethodMonitorName(methodObj.methodId);
                var aliasName = ndMethodMonitor.isMethodInCurrentMonitoringList(mthName);
                if (aliasName !== undefined) {
                    ndMethodMonitor.updateMMCounters(mthName, methodObj.methodId, endTime, aliasName)
                }
            }
            catch(err){util.logger.warn(err)}

        },0);

        flowpath.calls.push(methodObj);
//        }
    }
    catch(err)
    {
        util.logger.warn(err);
    }
};

module.exports = new MyFormatter();