/**
 * Created by compass241 on 17-08-2015.
 */

var Formatter = require('./njstrace/formatter.js');
var backend = require ('./backend/backendDetails');
var njstrace = require('./njstrace/njsTrace');
var category = require('./category');
var path  = require('path');
var url  = require('url');
var fs = require('fs');

var requestMap = new Object();
var methodMap = new Object();
var data;
var randomId = 0;
var ms = require('microseconds');
var agentSetting = require("./agent-setting");
var flowMap;
var clientConn = require("./client");
var btconf = require('./BT/btconfiguration');
var btrecord = require('./BT/BTRecord');
var util = require("./util");
var newID =0 ;
var newName;
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
        var getNamespace = require('continuation-local-storage').getNamespace,
            namespace = getNamespace('cavissonNamespace');

        if(agentSetting.isRequested == false) {
            return;
        }
        var date = new Date();
        var current_time = date.getTime();
        var sec_time = parseInt(current_time / 1000);

        var functionArguments = '';
//        console.log("Name of function called- "+args.args.callee);

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

                agentSetting.dataConnHandler.client.write(methodMetaData + "\n");
            }
        }

        var requestedObj=namespace.get('httpReq');

        /* var requestedObj = args.cavisson_req;


         if (requestedObj == undefined)
         {
         requestedObj = util.getRequestObject(args.args);
         }

         if(requestedObj == undefined)
         {
         return;
         }*/
        if(requestedObj != undefined)
            var localFlowPathId = requestedObj['flowPathId'];

        util.logger.info("Method invoked : "+args.name+" ,with FlowPathId : "+localFlowPathId);


        var timeAccCav = current_time - (agentSetting.cavEpochDiff * 1000);
        var startUpTime = timeAccCav - requestedObj.timeInMillis;

        var methodEntryData = methodMap[methodData] + '_0_' + startUpTime + '__';

        var flowpath = agentSetting.flowMap[localFlowPathId];

        var seqPfx = flowpath.seqPfx ;              //Because it was rewriting the map  value "seqPfx", so we took this value & again add it into map
        var tlFirstTierFPID = flowpath.tlFirstTierFPID ;

        if(flowpath.flowpathtime == undefined && flowpath.firstmethodid == undefined)
        {
            flowpath=new Object();
            if(tlFirstTierFPID != undefined)
                flowpath.tlFirstTierFPID = tlFirstTierFPID ;

            flowpath.seqPfx = seqPfx;

            firstmethodtimeId = methodMap[methodData];
            flowpath.firstmethodid=firstmethodtimeId;
            flowpath.flowpathtime=requestedObj.timeInMillis+(agentSetting.cavEpochDiff * 1000);
            agentSetting.flowMap[localFlowPathId]=flowpath;
        }

        var data = '';
        if (flowpath.seqblob!==undefined)
            flowpath.seqblob = flowpath.seqblob + methodEntryData;
        else
            flowpath.seqblob = methodEntryData;

        //agentSetting.flowMap[localFlowPathId] = data;
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

MyFormatter.prototype.onCompleteFlowPath = function(req,res) {

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
    if(flowpath.firstmethodseqblob === undefined)
    {
        var date = new Date ();
        var current_time = date.getTime();
        var endTime = current_time - flowpath.flowpathtime;

        flowpath.firstmethodseqblob = flowpath.firstmethodid + '_1_' + endTime + '_1___';

    }

    agentSetting.seqId =0;
    var date = new Date();
    var resp_current_time = date.getTime();

    var respTimeAccCav = resp_current_time - (agentSetting.cavEpochDiff*1000);

    var respTime = respTimeAccCav - req.timeInMillis;

    var URL=undefined;

    URL=req['originalUrl'];

    if(URL === undefined ){
        URL=req['url'];
    }
    var cat = category.getCategory(respTime,URL);

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

    if (agentSetting.isToInstrument && agentSetting.dataConnHandler && onExitFlag) {
        try {

            if(flowpath.seqblob ===  undefined)
            {
                var  data  = '4,' + localFlowPathId + ',' + res.statusCode + cat ;
            }
            else {
                var data = '4,' + localFlowPathId + ',' + res.statusCode + ',' + cat + ',' + flowpath.seqblob + flowpath.firstmethodseqblob;
            }

            util.logger.info("Dumping flowpath : "+data);
            agentSetting.dataConnHandler.client.write(data + "\n");

            delete agentSetting.flowMap[localFlowPathId];
            req['flowPathId'] = null;

        }catch(err){
            util.logger.warn("Error in dumping flowpath"+err);
        }

    }
}


// Implement the onExit method
MyFormatter.prototype.onExit = function(args)
{
    try {

        var getNamespace = require('continuation-local-storage').getNamespace,
            namespace = getNamespace('cavissonNamespace');

        if(agentSetting.isRequested == false)
            return;

        /* if (args.args == null) {
         console.log("arguments are null");
         return;
         }*/
        var requestedObj=namespace.get('httpReq');
        /* var requestedObj = args.cavisson_req;

         if (requestedObj == undefined) {
         requestedObj = util.getRequestObject(args.arguments);
         }

         if(requestedObj == undefined)
         {
         return;
         }
         */
        var localFlowPathId = -1;
        if (requestedObj != null) {
            localFlowPathId = requestedObj['flowPathId'];
        }
        else {
            return;
        }
        if(requestedObj['flowPathId'] == null)
        {
            return;
        }

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

        var date = new Date ();
        var curr_time = date.getTime();

        var endTime= curr_time -flowpath.flowpathtime;

        if(methodMap[methodData] == flowpath.firstmethodid){
            p = flowpath.firstmethodid + '_1_' + endTime + '_1___';
            flowpath.firstmethodseqblob=p;
        }else{

            var methodExitData = methodMap[methodData] + '_1_' + endTime + '_1___';

            var data = '';

            if (flowpath.seqblob!==undefined)
                flowpath.seqblob = flowpath.seqblob + methodExitData;
            else
                flowpath.seqblob = methodExitData;

            //agentSetting.flowMap[localFlowPathId] = data;
            if(methodExitData) {
                onExitFlag = true;
            }
        }
    }
    catch(err)
    {
        util.logger.warn("Error in dumping exit data:" + err);
    }
};

module.exports = new MyFormatter();