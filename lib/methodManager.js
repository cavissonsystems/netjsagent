/**
 * Created by compass241 on 17-08-2015.
 */
var methodCall = require('./flowpath/methodCall').MethodCall;
var flp = require('./flowpath/flowpath').Flowpath;
var Formatter = require('./njstrace/formatter.js');
var backend = require ('./backend/backendDetails');
var njstrace = require('./njstrace/njsTrace');
var category = require('./category');
var path  = require('path');
var url  = require('url');
var fs = require('fs');
var samples = require('./nodetime/lib/samples.js');

var methodMap = new Object();
var agentSetting = require("./agent-setting");
var flowMap;
var clientConn = require("./client");
var btconf = require('./BT/btconfiguration');
var btrecord = require('./BT/BTRecord');
var util = require("./util");
var newID = 0;
var newName ;
var firstmethodtimeId = '';
var p;
var onExitFlag = false;
var urlMap = new Object();


var btFile = path.join(path.resolve(__dirname),'/../../../ndBtRuleFile.txt');


// Create my custom Formatter class
function MyFormatter() {// No need to call Formatter ctor here

}


// But must "inherit" from Formatter
require('util').inherits(MyFormatter, Formatter);


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

        var functionArguments = '';
        //console.log("Name of function called- "+args.args.callee);

        var k=0;
        for (k = 0; k < args.args.length; k++)
        {
            var obj = args.args[k];
            if(obj) {
                if (functionArguments !== ''){
                    functionArguments = functionArguments+""+typeof obj + ";";}
                else
                {
                    functionArguments = typeof obj + ";";
                }
            }
        }

        var dirName = path.dirname(args.file);
        var baseName = path.basename(args.file, '.js');

        if (dirName == ".")
            dirName = "-";

        var methodData = dirName + "." + baseName + '.' + args.name + '(' + functionArguments + ')_' + args.line;

        var randomMethodId;

        if (methodMap[methodData] == undefined) {
            if (agentSetting.isToInstrument && agentSetting.dataConnHandler) {
                agentSetting.methodId = agentSetting.methodId + 1;
                methodMap[methodData] = agentSetting.methodId;
                randomMethodId = agentSetting.methodId;

                util.logger.info("Dumping metaRecord "+'5,' + methodData + ',' + randomMethodId);

                var methodMetaData = '5,' + methodData + ',' + randomMethodId;

                samples.add(methodMetaData + "\n");
            }
        }

        var requestedObj=namespace.get('httpReq');

        if(requestedObj == undefined) {

            util.logger.warn("requestedObj is undefined :");
            util.logger.warn(namespace)
            return;
        }
        var localFlowPathId = requestedObj['flowPathId'];

        if(requestedObj['flowPathId'] == null) {
            util.logger.warn("flowPathId is undefined :");
            return;
        }

        var  flowpath = agentSetting.flowMap[localFlowPathId];

         util.logger.info("Method invoked : "+args.name+" ,with FlowPathId : "+localFlowPathId);

        var current_time = new Date().getTime();
        var timeAccCav = current_time - (agentSetting.cavEpochDiff * 1000);
        var startUpTime = timeAccCav - requestedObj.timeInMillis;

        methodObj.methodId =  methodMap[methodData] ;
        methodObj.event =  '_0_' ;
        methodObj.startUpTime =  startUpTime ;
        //args.start_time = startUpTime ;

        if(flowpath == undefined)
            return;

        if(flowpath.methodStartTime == undefined && flowpath.firstmethodid == undefined)
        {
            flowpath.firstmethodid = methodMap[methodData];
            flowpath.methodStartTime = startUpTime;
            agentSetting.flowMap[localFlowPathId]=flowpath;
        }
        flowpath.calls.push(methodObj);

    }
    catch(err) {
        util.logger.warn("Error in dumping entry data" + err);
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
   methodMap = new Object();
   urlMap = new Object();
   newID = 0;
}

MyFormatter.prototype.onCompleteFlowPath = function(req,res) {

    var date = new Date();
    var resp_current_time = date.getTime();

    var respTimeAccCav = resp_current_time - (agentSetting.cavEpochDiff*1000);
    var respTime = respTimeAccCav - req.timeInMillis;

    var methodObj = new methodCall ();
    var localFlowPathId = -1;
    if (req != null) {
        localFlowPathId = req['flowPathId'];
    }
    else {
        return;
    }

    if(req['flowPathId'] == null)
    {
        return;
    }

    var flowpath=agentSetting.flowMap[localFlowPathId];

    if(flowpath.firstmethodid == undefined)
        return ;


    agentSetting.seqId =0;

    /* if(flowpath.firstmethodseqblob === undefined)
     {
     var endTime = respTime - flowpath.methodStartTime;
     flowpath.firstmethodseqblob = flowpath.firstmethodid + '_1_' + endTime + '_1___';
     }
     */
    flowpath.respTime = respTime ;
    var URL ;

    URL=req['originalUrl'];

    if(URL === undefined ){
        URL=req['url'];
    }

    var cat = category.getCategory(respTime,URL);

    flowpath.category = cat;
    flowpath.statusCode = res.statusCode
    agentSetting.flowMap[localFlowPathId]=flowpath;

    var ad ;

    if(!fs.existsSync(btFile))
    {
        ad = url.parse(URL) ;

        if(urlMap[ad] == undefined) {
            newID = ++newID;
            newName = ad.pathname;
            urlMap[ad] = newID;
        }
        else
        {
            newID = urlMap[ad];
            newName = ad.pathname;
        }

    }
    else
    {
        ad = btconf.matchData(URL);
        if (ad == undefined)                               //As there is case :if BT_file is present & particular URL is not defined in file,so original URL ll return.
        {
            ad = url.parse(URL);

            if (urlMap[ad] == undefined) {
                newID = ++newID;
                newName = ad.pathname;
                urlMap[ad] = newID;
            }
            else {
                newID = urlMap[ad];
                newName = ad.pathname;
            }
        }
        else
        {
            newID = ad.BTID;
            newName = ad.BTName;
        }
    }
    if(ad != null){

         util.logger.info("Dumping 8 record for "+'8,' + newID + "," + newName + "\n");

        var statusCode = res['statusCode'];

        btrecord.createAndUpdateBTRecord(newID,newName,respTime,cat,statusCode);
    }

    if (agentSetting.isToInstrument && agentSetting.dataConnHandler ) {
        try {


            process.nextTick(function(){
                try {
                    var encoded4_record = flowpath.generate_4_record();

                    util.logger.info("Dumping flowpath.js : " + encoded4_record);

                    samples.add(encoded4_record);

                    delete agentSetting.flowMap[localFlowPathId];
                    req['flowPathId'] = null;
                }
                catch(err)
                {
                    util.logger.warn("Error in Dumping flowpath");
                }

            });



        }catch(err){
            util.logger.warn("Error in dumping flowpath.js"+err);
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

        util.logger.info("Method ended : "+args.name+" ,with FlowPathId : "+localFlowPathId);

        var id;
        var functionArguments = '' ;
        var k=0;

        for (k = 0; k < args.arguments.length; k++) {

            var obj = args.arguments[k];
            // console.log(obj.constructor.name);

            if(obj) {
                if (functionArguments !== ''){
                    functionArguments = functionArguments + "" + typeof obj + ";";
                }
                else
                {
                    functionArguments = typeof obj + ";";
                }
            }

        }



        var dirName = path.dirname(args.file);
        var baseName = path.basename(args.file, '.js');

        if (dirName == ".")
            dirName = "-";


        var methodData = dirName + "." + baseName + '.' + args.name + '(' + functionArguments + ')_' + args.line;

        var flowpath = agentSetting.flowMap[localFlowPathId];

        if(undefined == flowpath)
            return ;

        var current_time = new Date().getTime();
        var timeAccCav = current_time - (agentSetting.cavEpochDiff * 1000);
        var methodEndTime = timeAccCav - requestedObj.timeInMillis;
        var endTime ;
        for(var i in flowpath.calls)
        {
            if(flowpath.calls[i].methodId == methodMap[methodData]) {
                endTime =methodEndTime - flowpath.calls[i].startUpTime ;
            }
        }
        //endTime = args.span;
        /*if(methodMap[methodData] == flowpath.firstmethodid){
         p = flowpath.firstmethodid + '_1_' + endTime + '_1___';
         flowpath.firstmethodseqblob=p;
         }else{*/
        methodObj.methodId = methodMap[methodData];
        methodObj.event = '_1_' ;
        methodObj.endTime = endTime ;
        flowpath.calls.push(methodObj);
//        }
    }
    catch(err)
    {
        util.logger.warn("Error in dumping exit data:" + err);
    }
};

module.exports = new MyFormatter();