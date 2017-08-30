/**
 * Created by Sahil on 9/9/16.
 */

var AgentSetting = require("../agent-setting");
var btManager = require('./btManager');
var samples = require('../nodetime/lib/samples');

var btDeatil = require('./BTDetails');
var util = require('./../util');

var vectorPrefix;
var btTimer=undefined ;

var vectorPrefixID;

function ndBTMonitor(){}


ndBTMonitor.handleBtMonitor = function () {
    1== AgentSetting.enableBTMonitor ? (AgentSetting.agentMode >= 2 ? ndBTMonitor.startBtMonitor():ndBTMonitor.stopBTMonitor()) :ndBTMonitor.stopBTMonitor();
}
ndBTMonitor.startBtMonitor = function ()
{
    try {
        if (AgentSetting.isTestRunning) {
            util.logger.info(AgentSetting.currentTestRun+" | BT Monitor started ,it ll dump data in every ",(AgentSetting.ndMonitorInterval/ 1000)," sec. ");
            if(btTimer===undefined)
                btTimer = setInterval(ndBTMonitor.dumpBTData, AgentSetting.ndMonitorInterval);
        }
    }
    catch(err)
    {util.logger.warn(AgentSetting.currentTestRun+" | "+err)}

}

ndBTMonitor.dumpBTData = function () {
    try {
        var allBt = new btDeatil();
        //vectorPrefix = AgentSetting.tierName + AgentSetting.ndVectorSeparator + AgentSetting.ndAppServerHost + AgentSetting.ndVectorSeparator + AgentSetting.appName + AgentSetting.ndVectorSeparator;
        //vectorPrefixID = AgentSetting.tierID + "|" + AgentSetting.appID + "|";
        if (AgentSetting.autoSensorConnHandler.client) {
            var map = btManager.getbtMonCountersMap();

            var keys = Object.keys(map)
            for (var i in keys) {
                var bt = map[keys[i]];
                var btId = keys[i];
                if (bt) {
                    bt.updateNCounter();
                    var data = ndBTMonitor.dump74RecordForEveryBT(bt, btId)
                    allBt.updateOverAllBTDetail(bt);
                    samples.toBuffer(data)
                    if(AgentSetting.enableBTMonitorTrace > 0)
                        util.logger.info(AgentSetting.currentTestRun,' | Dumping 74 Record For Every BT :',data)
                    // AgentSetting.autoSensorConnHandler.write(data);
                }
            }
            if (allBt.BTID !== undefined) {
                var overall = ndBTMonitor.dump74RecordForEveryBT(allBt, allBt.BTID);
                allBt.init();
                samples.toBuffer(overall)
                if(AgentSetting.enableBTMonitorTrace > 0)
                    util.logger.info(AgentSetting.currentTestRun,' | Dumping 74 Record For Overall BT :',overall)
                //AgentSetting.autoSensorConnHandler.write(overall);
            }
        }

    }catch (err) {
        util.logger.warn(AgentSetting.currentTestRun+" | Error in Dumping BT record : " + err)
    }
}

ndBTMonitor.dump74RecordForEveryBT = function(eachBTData,BTID){

    var reqPerSecond = 0.0;
    var avgCpuTime = 0.0;
    var avgRespTime = 0.0;
    var errorsPerSecond = 0.0;
    var normalAvgRespTime = 0.0;
    var slowAvgRespTime = 0.0;
    var verySlowAvgRespTime = 0.0;
    var errorsAvgRespTime = 0.0;
    var slowAndVerySlowPct = 0.0;

    var noOfReq = eachBTData.count;
    var noOfNormalReq = eachBTData.NormalCount;
    var noOfSlowReq = eachBTData.SlowCount;
    var noOfVerySlowReq = eachBTData.VerySlowCount;
    var noOfError = eachBTData.errorCount;

    var duration = eachBTData.duration;
    var normalDuration = eachBTData.normalDuration;
    var slowDuration = eachBTData.slowDuration;
    var verySlowDuration = eachBTData.verySlowDuration;
    var errorDuration = eachBTData.errorDuration;
    var avgReqSize=0.0, avgResSize=0.0;

    var btData = '';

    btData += '74,';
    btData += AgentSetting.vectorPrefixID;
    btData += BTID;
    btData += ':';
    btData += AgentSetting.vectorPrefix;
    btData += eachBTData.BTName;
    btData += '|';

    if (noOfReq > 0) {
        reqPerSecond =  noOfReq / parseInt(AgentSetting.ndMonitorInterval / 1000);
        avgRespTime =  duration /  noOfReq;
        slowAndVerySlowPct =  (((noOfSlowReq + noOfVerySlowReq) * 100) / noOfReq);
    }
    if (noOfError > 0) {
        errorsPerSecond =  noOfError / parseInt(AgentSetting.ndMonitorInterval / 1000);
        errorsAvgRespTime =  errorDuration /  noOfError;
    }
    if (noOfSlowReq > 0){
        slowAvgRespTime =  slowDuration /  noOfSlowReq;
    }
    if (noOfNormalReq > 0){
        normalAvgRespTime =  normalDuration /  noOfNormalReq;
    }
    if (noOfVerySlowReq > 0){
        verySlowAvgRespTime =  verySlowDuration /  noOfVerySlowReq;
    }
    if (noOfReq > 0) {
        avgReqSize = (Number(eachBTData.reqContentLength)/Number(noOfReq))/1024; //Request/Response size - converting into KB
        avgResSize = (Number(eachBTData.resContentLength)/Number(noOfReq))/1024;
    }
    btData += reqPerSecond;
    btData += ' ';
    btData += avgRespTime;
    btData += ' ';
    btData += ndBTMonitor.checkAndGetMinValue(eachBTData.minDuration);
    btData += ' ';
    btData += eachBTData.maxDuration;
    btData += ' ';
    btData += eachBTData.count;
    btData += ' ';
    btData += '0.0';
    btData += ' ';
    btData += errorsPerSecond;
    btData += ' ';
    btData += normalAvgRespTime;
    btData += ' ';
    btData += ndBTMonitor.checkAndGetMinValue(eachBTData.minNormalDuration);
    btData += ' ';
    btData += eachBTData.maxNormalDuration;
    btData += ' ';
    btData += eachBTData.NormalCount;
    btData += ' ';
    btData += slowAvgRespTime;
    btData += ' ';
    btData += ndBTMonitor.checkAndGetMinValue(eachBTData.minSlowDuration);
    btData += ' ';
    btData += eachBTData.maxSlowDuration;
    btData += ' ';
    btData += eachBTData.SlowCount;
    btData += ' ';
    btData += verySlowAvgRespTime;
    btData += ' ';
    btData += ndBTMonitor.checkAndGetMinValue(eachBTData.minVerySlowDuration);
    btData += ' ';
    btData += eachBTData.maxVerySlowDuration;
    btData += ' ';
    btData += eachBTData.VerySlowCount;
    btData += ' ';
    btData += errorsAvgRespTime;
    btData += ' ';
    btData += ndBTMonitor.checkAndGetMinValue(eachBTData.minErrorDuration);
    btData += ' ';
    btData += eachBTData.maxErrorDuration;
    btData += ' ';
    btData += eachBTData.errorCount;
    btData += ' ';
    btData += slowAndVerySlowPct;
    btData += ' ';
    btData += '0 0 0 ';
    btData += eachBTData.count;
/*    btData += ' ';
    btData += avgResSize;*/


    btData += '\n';

    return btData;

}

ndBTMonitor.checkAndGetMinValue = function(duration) {
    if (duration == Number.MAX_VALUE)
        return duration = Number.MAX_VALUE;

    return duration;
}

ndBTMonitor.stopBTMonitor = function ()
{
    try {
        util.logger.info(AgentSetting.currentTestRun + " | Cleaning BT monitor .");
        clearInterval(btTimer);
        btTimer=undefined;
    }
    catch(err)
    {util.logger.warn(AgentSetting.currentTestRun+" | "+err)}
}

module.exports = ndBTMonitor;
