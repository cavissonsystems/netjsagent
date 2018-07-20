/**
 * Created by Sahil on 9/9/16.
 */


var AgentSetting = require("../agent-setting");
var backendDetails = require('../backend/backendDetails');
var samples = require('../nodetime/lib/samples');
var util = require('./../util');

var vectorPrefix;

var vectorPrefixID;

function ndBackendMonitor(){}

ndBackendMonitor.backendTimer=undefined;

ndBackendMonitor.handleBackendMonitor = function ()
{
    if(AgentSetting.isBackendMonitorEnabled && AgentSetting.agentMode >= 2)    
        ndBackendMonitor.init();
    else
        ndBackendMonitor.stopBackendMonitor();
}

ndBackendMonitor.init = function ()
{
    try {
        if (AgentSetting.isTestRunning) {
            util.logger.info(AgentSetting.currentTestRun+" | Backend Monitor started ,it ll dump data in every ",(AgentSetting.ndMonitorInterval/ 1000)," sec. ");
            if(ndBackendMonitor.backendTimer === undefined)
            ndBackendMonitor.backendTimer = setInterval(ndBackendMonitor.dumpBackendData, AgentSetting.ndMonitorInterval);
        }
    }
    catch(err)
    {util.logger.warn(AgentSetting.currentTestRun+" | "+err)}
}

ndBackendMonitor.dumpBackendData = function () {

    try {
        var keys = Object.keys(AgentSetting.backendRecordMap);
        if (AgentSetting.autoSensorConnHandler && AgentSetting.autoSensorConnHandler.client) {
            if (keys.length != 0) {
                for (var i = 0; i < keys.length; i++) {

                    var backendrecordKey = keys[i];
                    var eachBackendData = AgentSetting.backendRecordMap[keys[i]];


                    if (eachBackendData.cumCount > 0) {
                        eachBackendData.rate = eachBackendData.invocationCount / (parseInt(AgentSetting.ndMonitorInterval) / 1000);    // 30 is setInterval time for eachBTDataing data
                    }

                    /*if (eachBackendData.errorCumCount > 0) {
                     eachBackendData.errorRate = eachBackendData.errorInvocationCount / parseInt(AgentSetting.ndMonitorInterval / 1000);
                     }*/

                    var data75 = ndBackendMonitor.make75Data(eachBackendData);

                    if (AgentSetting.enableBackendMonTrace > 0)
                        util.logger.info(AgentSetting.currentTestRun, ' | Dumping Backend Method Monitor Data is : ', data75);

                    samples.toBuffer(data75)

                    eachBackendData.minDuration = Number.MAX_VALUE;
                    eachBackendData.maxDuration = 0;

                    eachBackendData.sumDuration = 0;
                    eachBackendData.avgDuration = 0;


                    //eachBackendData.cumCount = 0;
                    //eachBackendData.errorCumCount = 0;
                    eachBackendData.invocationCount = 0;
                    eachBackendData.errorInvocationCount = 0;

                    eachBackendData.rate = 0;
                    eachBackendData.errorRate = 0;

                    //Network Delay in Req.
                    eachBackendData.sumNetworkDelayInRequest = 0;
                    eachBackendData.avgNetworkDelayInRequest = 0;
                    eachBackendData.minNetworkDelayInRequest = Number.MAX_VALUE;
                    eachBackendData.maxNetworkDelayInRequest = 0;

                    //Network Delay in Res.
                    eachBackendData.sumNetworkDelayInResponse = 0;
                    eachBackendData.avgNetworkDelayInResponse = 0;
                    eachBackendData.minNetworkDelayInResponse = Number.MAX_VALUE;
                    eachBackendData.maxNetworkDelayInResponse = 0;
                }
            }
        }
    }
    catch(err)
    {
        util.logger.warn("Error in Dumping BT record : " + err)
    }
}

ndBackendMonitor.make75Data = function(data75){
    if(data75.minDuration == Number.MAX_VALUE)
    {
        data75.minDuration = 0;
    }

    return '75,' + AgentSetting.vectorPrefixID
        + data75.backendID
        + ':'
        + AgentSetting.vectorPrefix
        + data75.BackendName
        + '|'
        + data75.cumCount
        + ' '
        + data75.rate
        + ' '
        + data75.avgDuration
        + ' '
        + data75.minDuration
        + ' '
        + data75.maxDuration
        + ' '
        + data75.invocationCount
        + ' '
        + data75.errorInvocationCount
        + ' '
        + data75.avgNetworkDelayInRequest
        + ' '
        + data75.minNetworkDelayInRequest
        + ' '
        + data75.maxNetworkDelayInRequest
        + ' '
        + data75.invocationCount
        + ' '
        + data75.avgNetworkDelayInResponse
        + ' '
        + data75.minNetworkDelayInResponse
        + ' '
        + data75.maxNetworkDelayInResponse
        + ' '
        + data75.invocationCount
        + '\n';

}

ndBackendMonitor.stopBackendMonitor = function ()
{
    try {
        util.logger.info(AgentSetting.currentTestRun + " | Cleaning Backend monitor .");
        clearInterval(ndBackendMonitor.backendTimer);
        ndBackendMonitor.backendTimer=undefined;
    }
    catch(err)
    {util.logger.warn(AgentSetting.currentTestRun+" | "+err)}
}

module.exports = ndBackendMonitor;
