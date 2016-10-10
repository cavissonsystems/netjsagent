/**
 * Created by Sahil on 9/9/16.
 */

var AgentSetting = require("../agent-setting");
var btManager = require('./btManager');

var btDeatil = require('./BTDetails');
var util = require('./../util');

var vectorPrefix;

var vectorPrefixID;

function ndBTMonitor(){}

ndBTMonitor.init = function ()
{
    try {
        if (AgentSetting.isTestRunning) {
            util.logger.info(AgentSetting.currentTestRun+" | BT Monitor started ,it ll dump data in every 30 sec. ");
            ndBTMonitor.btTimer = setInterval(ndBTMonitor.dumpBTData, 30000);
        }
    }
    catch(err)
    {util.logger.warn(AgentSetting.currentTestRun+" | "+err)}

}

ndBTMonitor.dumpBTData = function () {
    try {

        var overAllBTDetail = new btDeatil();

        //var keys = Object.keys(AgentSetting.btrecordMap);
		var keys = btManager.getBTKey();
		if (keys.length != 0) {
            for (var i = 0; i < keys.length; i++) {

                var btrecordKey = keys[i];

                var eachBTData = btManager.getBTData(keys[i]);

                if (eachBTData.count > 0) {
                    //TODO : There should be monitorIntervalTime in place of 30
                    eachBTData.reqPerSecond = eachBTData.count / 30;    // 30 is setInterval time for eachBTDataing data
                    eachBTData.avgRespTime = eachBTData.duration / eachBTData.count;
                    eachBTData.slowAndVerySlowPct = ( ((eachBTData.SlowCount + eachBTData.VerySlowCount) * 100) / eachBTData.count);
                }

                if (eachBTData.errorCount > 0) {
                    eachBTData.errorsPerSecond = eachBTData.errorCount / 30;
                    eachBTData.errorsAvgRespTime = eachBTData.errorDuration / eachBTData.errorCount;
                }

                if (eachBTData.SlowCount > 0) {
                    eachBTData.slowAvgRespTime = eachBTData.slowDuration / eachBTData.SlowCount;
                }

                if (eachBTData.NormalCount > 0) {
                    eachBTData.normalAvgRespTime = eachBTData.normalDuration / eachBTData.NormalCount;
                }

                if (eachBTData.VerySlowCount > 0) {
                    eachBTData.verySlowAvgRespTime = eachBTData.verySlowDuration / eachBTData.VerySlowCount;
                }

                vectorPrefix = AgentSetting.tierName + AgentSetting.ndVectorSeparator + AgentSetting.ndAppServerHost + AgentSetting.ndVectorSeparator + AgentSetting.appName + AgentSetting.ndVectorSeparator;
                vectorPrefixID = AgentSetting.tierID + "|" + AgentSetting.appID + "|";

                overAllBTDetail.updateOverAllBTDetail(eachBTData);
                if (btrecordKey != undefined) {
                    ndBTMonitor.checkDuration(eachBTData);

                      if (AgentSetting.isToInstrument && AgentSetting.autoSensorConnHandler) {

                        var data74 = ndBTMonitor.make74Data(eachBTData, btrecordKey);

                        AgentSetting.autoSensorConnHandler.write(data74);

                    }
                }

                //delete AgentSetting.btrecordMap[keys[i]];
				btManager.deleteBTRecord(keys[i]);
        }
        if (overAllBTDetail.BTID != undefined) {
            ndBTMonitor.checkDuration(overAllBTDetail);

            if (AgentSetting.isToInstrument && AgentSetting.autoSensorConnHandler) {

                var data74 = ndBTMonitor.make74Data(overAllBTDetail, overAllBTDetail.BTID);

                AgentSetting.autoSensorConnHandler.write(data74);
            }
        }
    }
    }catch (err) {
        util.logger.warn(AgentSetting.currentTestRun+" | Error in Dumping BT record : " + err)
    }
}

ndBTMonitor.make74Data = function(data74,BTID){

    return '74,' + vectorPrefixID + BTID + ':' + vectorPrefix + data74.BTName + '|' + data74.reqPerSecond + ' ' + data74.avgRespTime + ' ' + data74.minDuration + ' ' + data74.maxDuration + ' ' + data74.count + ' ' + '0.0' + ' ' + data74.errorsPerSecond + ' ' + data74.normalAvgRespTime + ' ' + data74.minNormalDuration + ' ' + data74.maxNormalDuration + ' ' + data74.NormalCount + ' ' + data74.slowAvgRespTime + ' ' + data74.minSlowDuration + ' ' + data74.maxSlowDuration + ' ' + data74.SlowCount + ' ' + data74.verySlowAvgRespTime + ' ' + data74.minVerySlowDuration + ' ' + data74.maxVerySlowDuration + ' ' + data74.VerySlowCount + ' ' + data74.errorsAvgRespTime + ' ' + data74.minErrorDuration + ' ' + data74.maxErrorDuration + ' ' + data74.errorCount + ' ' + data74.slowAndVerySlowPct + '\n';

}

ndBTMonitor.checkDuration = function(duration){
    if(duration.minDuration == Number.MAX_VALUE){
        duration.minDuration = 0;
    }

    if(duration.minNormalDuration == Number.MAX_VALUE){
        duration.minNormalDuration = 0;
    }

    if(duration.minSlowDuration == Number.MAX_VALUE){
        duration.minSlowDuration = 0;
    }

    if(duration.minVerySlowDuration == Number.MAX_VALUE){
        duration.minVerySlowDuration = 0;
    }

    if(duration.minErrorDuration == Number.MAX_VALUE){
        duration.minErrorDuration = 0;
    }

}

ndBTMonitor.stopBTMonitor = function ()
{
    try {
        util.logger.info(AgentSetting.currentTestRun + " | Cleaning BT monitor .");
        clearInterval(ndBTMonitor.btTimer);
    }
    catch(err)
    {util.logger.warn(AgentSetting.currentTestRun+" | "+err)}
}

module.exports = ndBTMonitor;