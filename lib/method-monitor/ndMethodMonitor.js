/**
 * Created by Sahil on 9/29/16.
 */

var AgentSetting = require("../agent-setting");
var ndMethodMonitorData = require('./ndMethodMonitorData.js');
var monitoringList = new Object();
var fs = require('fs');
var methodMonitorMap = new Object();
var util = require("../util");
var mmTimer;
var vectorPrefix;
var vectorPrefixID;
var monitoringId = 0;

function ndMethodMonitor(){}

ndMethodMonitor.parseMethodMonitor = function(filedata)
{
    try{
        var methodList = fs.readFileSync(filedata).toString().trim().split('\n');
        for(i in methodList)
        {
            if (methodList[i].length == 0 || (methodList[i].startsWith("#")) || (methodList[i].startsWith(" "))) {
                //util.logger.warn(Server.TestRunIDValue,"","","Invalid line found, so ignoring.");
                continue;
            }
            var methodData = methodList[i].split('|');

            monitoringList[methodData[1]] = methodData[0];
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

        methodObj.updateDuration(duration)
    }
    catch(err)
    {
        util.logger.warn(err);
    }
}

ndMethodMonitor.dumpMethodMonitor =  function()
{
    //var methodID = -1;
    /*var cumCount = 0;
    var invocationCount = 0; // Total number of invocations from all threads for the sample period

    var minDuration = Number.MAX_VALUE;
    var maxDuration = 0;

    var avgDuration = 0;
    var sumDuration = 0;

    //long threadID;
    var rate;*/

    try {
        var keys = Object.keys(methodMonitorMap);
        if (keys.length) {
            for (i in keys) {
                var methodName = keys[i];
                var methodData = methodMonitorMap[keys[i]];

                methodData.invocationCount += methodData.cumCount - methodData.prevCumCount;

                // Calculate Total Duration
//            methodData.sumDuration += methodData.sumDuration;

                //calculate minimum duration
                /*if (minDuration > methodData.minDuration)
                 minDuration = methodData.minDuration;

                 //calculate maximum duration
                 if (maxDuration < methodData.maxDuration)
                 maxDuration = methodData.maxDuration;*/


                if (methodData.cumCount > 0) {
                    //TODO : There should be monitorIntervalTime in place of 30
                    methodData.rate = methodData.invocationCount / 30;    // 30 is setInterval time for eachBTDataing data
                }

                if (methodData.invocationCount != 0)
                    methodData.avgDuration = methodData.sumDuration / methodData.invocationCount;// in MS

                if (AgentSetting.isToInstrument) {
                    vectorPrefix = AgentSetting.tier + AgentSetting.ndVectorSeparator + AgentSetting.server + AgentSetting.ndVectorSeparator + AgentSetting.instance + AgentSetting.ndVectorSeparator;
                    vectorPrefixID = AgentSetting.tierID + "|" + AgentSetting.appID + "|";
                    var data61 = ndMethodMonitor.makeMM(methodData);

                    AgentSetting.autoSensorConnHandler.write(data61);
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
        if (AgentSetting.isTestRunning) {
            mmTimer = setInterval(ndMethodMonitor.dumpMethodMonitor, 30000);
        }
    }
    catch(err){util.logger.warn(err)}
}

ndMethodMonitor.stopMethodMonitor = function()
{
    try{
    clearInterval(mmTimer);
    }
    catch(err){util.logger.warn(err)}
}

ndMethodMonitor.makeMM = function(data)
{
    try {
        if (data.minDuration == Number.MAX_VALUE) {
            data.minDuration = 0;
        }
        return '61,' + vectorPrefixID + data.methodId + ':' + vectorPrefix + data.aliasname + '|' + data.cumCount + ' ' + data.rate + ' ' + data.avgDuration + ' ' + data.minDuration + ' ' + data.maxDuration + ' ' + data.invocationCount + '\n';
    }
    catch(err)
    {util.logger.warn(err)}
}
module.exports = ndMethodMonitor;