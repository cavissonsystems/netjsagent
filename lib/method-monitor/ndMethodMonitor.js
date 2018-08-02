/**
 * Created by Sahil on 9/29/16.
 */

var AgentSetting = require("../agent-setting");
var ndMethodMonitorData = require('./ndMethodMonitorData.js');
var monitoringList = new Object();
var samples = require('../nodetime/lib/samples');
var fs = require('fs');
var methodMonitorMap = new Object();
var util = require("../util");
var mmTimer = undefined;
var monitoringId = 0;

function ndMethodMonitor(){}

ndMethodMonitor.clearMMList = function(){
    monitoringList = new Object();
};

ndMethodMonitor.resetMonitorCounters = function() {
    for(var i in methodMonitorMap){
        methodMonitorMap[i].initOnStartInstr();
    }
}

ndMethodMonitor.clearMmMap = function() {
    methodMonitorMap = new Object();
}

ndMethodMonitor.parseMethodMonitor = function(filedata)
{
    try{
        monitoringList=new Object();            //Clearing all maps
        methodMonitorMap=new Object();
        if(filedata !== undefined && filedata.length > 0) {
            for (var i in filedata) {
               if (filedata[i].length == 0 || (filedata[i].toString().trim().startsWith("#")) || (filedata[i].toString().trim().startsWith(" "))) {
                    util.logger.warn(AgentSetting.currentTestRun,"| Invalid line found, so ignoring.");
                    continue;
                }
                var methodData = filedata[i].toString().trim().split("|"),
                    aliasName ,methodName;
                //var methodName = content[1].substring(content[1].lastIndexOf(".")+1,content[1].indexOf("("));
                if(methodData.length > 1) {
                    aliasName = methodData[0], methodName = methodData[1];
                }
                else{
                    util.logger.warn(AgentSetting.currentTestRun,"| Invalid line found, so ignoring.",filedata[i].toString());
                    continue;
                }
                if(monitoringList[methodName]) {
                    util.logger.warn(AgentSetting.currentTestRun,"| Same methodName already exists.",filedata[i].toString());
                    continue
                }
                if(!aliasName || "NA"==aliasName) {
                    util.logger.warn(AgentSetting.currentTestRun,"| No alias name is forund for :",methodName,",setting methodName as display name");
                    aliasName = methodName;
                }
                monitoringList[methodName] = aliasName ;
            }
        }
    }catch (err) {
        util.logger.warn(err);
    }
}

ndMethodMonitor.isMethodInCurrentMonitoringList = function(fqm)
{
    try {
            return monitoringList[fqm];
    }   catch(e)
    {util.logger.warn(e)}
}

ndMethodMonitor.getMonitorId =  function(fqm) {
    return methodMonitorMap[fqm].monitoringId;
}

ndMethodMonitor.updateMMCounters = function (fqm,methodId,duration,aliasname) {

    try {
        var methodObj = methodMonitorMap[methodId];

        if (methodObj == undefined) {
            ++monitoringId;
            methodObj = new ndMethodMonitorData(methodId, monitoringId, aliasname);
            methodMonitorMap[methodId] = methodObj;
        }

        if(methodObj == undefined)
            return;

        methodObj.updateDuration(duration)
	if(AgentSetting.ndMethodMonTraceLevel > 0)
         util.logger.info(AgentSetting.currentTestRun,' | Updated value for ',fqm,' : ',methodObj); 
    }
    catch(err)
    {
        util.logger.warn(err);
    }
}

ndMethodMonitor.dumpMethodMonitor =  function()
{
    try {
        var keys = Object.keys(methodMonitorMap);
        if (AgentSetting.autoSensorConnHandler && AgentSetting.autoSensorConnHandler.client) {
            if (keys.length) {
                for (i in keys) {
                    var methodName = keys[i];
                    var methodData = methodMonitorMap[keys[i]];

                    methodData.invocationCount += methodData.cumCount - methodData.prevCumCount;
                    if (methodData.cumCount > 0)
                        methodData.rate = methodData.invocationCount / parseInt(AgentSetting.ndMonitorInterval / 1000);    // 120 is setInterval time for eachBTDataing data

                    if (methodData.invocationCount != 0)
                        methodData.avgDuration = methodData.sumDuration / methodData.invocationCount;// in MS

                    var data61 = ndMethodMonitor.makeMM(methodData);

                    if (AgentSetting.ndMethodMonTraceLevel > 0)
                        util.logger.info(AgentSetting.currentTestRun +' | Dumping data for ' + methodData.aliasname + ' => '+ data61)

                    samples.toBuffer(data61);
                    methodData.reset();
                }
            }
        }
    }
    catch(err){util.logger.warn(err)}
}

ndMethodMonitor.startMethodMonitor = function()
{
    try {
        if (AgentSetting.isTestRunning && AgentSetting.agentMode >= 2) {
            if(mmTimer === undefined)
            	mmTimer = setInterval(ndMethodMonitor.dumpMethodMonitor, AgentSetting.ndMonitorInterval);
        }
        else
            ndMethodMonitor.stopMethodMonitor();
    }
    catch(err){util.logger.warn(err)}
}

ndMethodMonitor.stopMethodMonitor = function()
{
    try{
        clearInterval(mmTimer);
        mmTimer = undefined;
        ndMethodMonitor.clearMMList();
        ndMethodMonitor.clearMmMap();
    }
    catch(err){util.logger.warn(err)}
}

ndMethodMonitor.makeMM = function(data)
{
    try {
        /*if (data.minDuration == Number.MAX_VALUE) {
            data.minDuration = 0;
        }*/
        return '61,' + AgentSetting.vectorPrefixID + data.methodId + ':' + AgentSetting.vectorPrefix + data.aliasname + '|' + data.cumCount + ' ' + data.rate + ' ' + data.avgDuration + ' ' + data.minDuration + ' ' + data.maxDuration + ' ' + data.invocationCount + '\n';
    }
    catch(err)
    {util.logger.warn(err)}
}
module.exports = ndMethodMonitor;
