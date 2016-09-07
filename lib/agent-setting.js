/**
 * Created by bala on 22/7/15.
 */
var PropertiesReader = require('properties-reader');
var fs = require('fs');
var btDetail = require('./BT/BTDetails');
var backendDetails = require('./backend/backendDetails');
var util = require('./util');
var Long = require('long');
var cluster = require('cluster');

var defaultTier = 'NodeJS';
var defaultServer = 'Nsecom';
var defaultInstance = 'Nsecom';
var defaultNdcPort = '7892';
var defaultNdcHost = 'localhost';

var vectorPrefix;

var vectorPrefixID;

function AgentSetting() {}

AgentSetting.currentTestRun= 0 ;
AgentSetting.isTestRunning=false;

AgentSetting.isCluster = function()
{
    var instance ;

    var clusterPath = '/tmp/cavisson/cluster';
    if(!cluster.isMaster)
    {
        if(fs.existsSync(clusterPath)) {
            fs.readdir(clusterPath, function (err, files) {
                try {
                    if (err)console.log(err);
                    files.forEach(function (file) {

                        var index = file.split('.')[0];

                        var data = fs.readFileSync(clusterPath + '/' + file).toString();

                        if (data == process.pid) {
                            instance = AgentSetting.instance
                            if (instance.indexOf('_') != -1) {
                                instance = instance.split('_')[0];
                            }
                            instance = instance + '_' + index;

                            AgentSetting.instance = instance;
                            console.log(AgentSetting.instance)
                        }
                    });
                }catch(err){console.log(err)}
            });
        }
    }

}
AgentSetting.getBTData = function(filename)
{
    var data = fs.readFileSync(filename).toString().split("\r\n");
    for (var i = 0; i < data.length; i++) {
        var BT = new Object();

        var dataValue = data[i].split("|");
        var url = dataValue[0];
        BT.slow = dataValue[1];
        BT.vryslow = dataValue[2];
        AgentSetting.categoryMap[url] = BT;

    }
    myTime = setInterval(AgentSetting.alertFunc, 30000);
}

AgentSetting.initAllMap = function()
{
    AgentSetting.btrecordMap = new Object();
    AgentSetting.categoryMap = new Object();
    AgentSetting.backendRecordMap = new Object();
    AgentSetting.backendMetaMap = new Object();
    AgentSetting.flowMap = new Object();
    AgentSetting.queryMap = new Object();              //Query map for dumping meta query record (23)

    AgentSetting.methodId = 0;
    AgentSetting.backendID = 0;
    AgentSetting.seqId = 0;
    AgentSetting.queryId = 6;               //Every query has unique id & used to dump quey meta record(23) , starting from 6 because 1-6 id are reserved

}

AgentSetting.generateFPMask = function()
{
    //For creating FP_ID
    //  "0x4000000000000000 +((0 &  0x0F) << 56)+ ((0 & 0x03FF) << 46)";

    var  FP_shifting_56 = new Long(0x0F).and(0).shl(56);
    var FP_shifting_46 = new Long(0x03FF).and(0).shl(46);;
    var  flowPathInstanceInitial = new Long(0x00000000,0x40000000).add(FP_shifting_46).add(FP_shifting_56);

    AgentSetting.flowPathInstanceInitialID = flowPathInstanceInitial.toString();
    AgentSetting.timeStampMask = parseInt(0x3FFFFFFFFF,16);
    AgentSetting.seqNoDigits = 8;
    AgentSetting.seqNumMask = parseInt(0xFF,16);

}

AgentSetting.setDefault = function () {
    AgentSetting.tier = defaultTier;
    AgentSetting.server = defaultServer;
    AgentSetting.instance = defaultInstance;
    AgentSetting.ndcPort = defaultNdcPort;
    AgentSetting.ndcHost = defaultNdcHost;

    AgentSetting.enable_heapdump = 0;
    AgentSetting.enable_cpu_profiling = 0
    AgentSetting.enable_eventLoop_monitor = 0
    AgentSetting.enable_garbage_profiler = 0

}

//This method is checking ,ndSetting file has been changed or not, if changed , recreate the connection
AgentSetting.checkNDSettingFile = function(settingFile)
{
    AgentSetting.isCluster();
    var stat = fs.statSync(settingFile);

    if(stat.size != AgentSetting.lastModifiedSize || stat.mtime != AgentSetting.lastModifiedTime) {
        util.logger.info("ndSetting File is changed , reading it agin .");
        AgentSetting.getData(settingFile);           //getting data for making connection to ndc
    }
};

AgentSetting.getData = function (filename) {

    var stat = fs.statSync(filename)        //Getting the stat of file .

    AgentSetting.lastModifiedSize = stat.size;
    AgentSetting.lastModifiedTime = stat.mtime;

    AgentSetting.isToInstrument = false;    // It will true when control connection has made.

    AgentSetting.isRequested = false;       //check only for http requests
    AgentSetting.filename = filename;

    AgentSetting.bciStartUpTime = new Date().getTime();


    if (filename == undefined) {
        AgentSetting.setDefault();
        return AgentSetting;
    }
    var properties = null;

    try {
        properties = PropertiesReader(filename);
    }
    catch (err) {
        util.logger.warn("Cannot read propery file due to : " + err);
        AgentSetting.setDefault();
        return AgentSetting;

    }
    util.logger.info("Setting configuration arguments from : " + filename);

    AgentSetting.tier = properties.get('tier');
    AgentSetting.server = properties.get('server');
    AgentSetting.instance = properties.get('instance');
    AgentSetting.ndcPort = properties.get('ndcPort');
    AgentSetting.ndcHost = properties.get('ndcHost');

    AgentSetting.enable_heapdump = properties.get('heapDump');
    AgentSetting.enable_cpu_profiling = properties.get('cpuProfiling');
    AgentSetting.enable_eventLoop_monitor = properties.get('eventLoopMonitor');
    AgentSetting.enable_garbage_profiler = properties.get('gcProfiler');

    return AgentSetting;
};

AgentSetting.checkDuration = function(duration){
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

AgentSetting.make74Data = function(data74,BTID){

    return '74,' + vectorPrefixID + BTID + ':' + vectorPrefix + data74.BTName + '|' + data74.reqPerSecond + ' ' + data74.avgRespTime + ' ' + data74.minDuration + ' ' + data74.maxDuration + ' ' + data74.count + ' ' + '0.0' + ' ' + data74.errorsPerSecond + ' ' + data74.normalAvgRespTime + ' ' + data74.minNormalDuration + ' ' + data74.maxNormalDuration + ' ' + data74.NormalCount + ' ' + data74.slowAvgRespTime + ' ' + data74.minSlowDuration + ' ' + data74.maxSlowDuration + ' ' + data74.SlowCount + ' ' + data74.verySlowAvgRespTime + ' ' + data74.minVerySlowDuration + ' ' + data74.maxVerySlowDuration + ' ' + data74.VerySlowCount + ' ' + data74.errorsAvgRespTime + ' ' + data74.minErrorDuration + ' ' + data74.maxErrorDuration + ' ' + data74.errorCount + ' ' + data74.slowAndVerySlowPct + '\n';

}

AgentSetting.alertFunc = function () {
    try {

        var overAllBTDetail = new btDetail();

        var keys = Object.keys(AgentSetting.btrecordMap);

        if (keys.length != 0) {
            for (var i = 0; i < keys.length; i++) {

                var btrecordKey = keys[i];

                var eachBTData = AgentSetting.btrecordMap[keys[i]];

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
                    AgentSetting.checkDuration(eachBTData);

                    if (AgentSetting.isToInstrument && AgentSetting.dataConnHandler) {

                        var data74 = AgentSetting.make74Data(eachBTData, btrecordKey);

                        util.logger.info("Dumping BT record : " + data74);

                        AgentSetting.autoSensorConnHandler.write(data74);

                    }
                }

                delete AgentSetting.btrecordMap[keys[i]];
            }
        }
        if (overAllBTDetail.BTID != undefined) {
            AgentSetting.checkDuration(overAllBTDetail);

            if (AgentSetting.isToInstrument && AgentSetting.dataConnHandler) {

                var data74 = AgentSetting.make74Data(overAllBTDetail, overAllBTDetail.BTID);

                util.logger.info("Dumping overAll BT record : " + data74);

                AgentSetting.autoSensorConnHandler.write(data74);
            }
        }
    }
    catch(err)
    {
        util.logger.warn("Error in Dumping BT record : " + err)
    }
    AgentSetting.manage75record();
}

AgentSetting.manage75record = function () {

    try {
        var keys = Object.keys(AgentSetting.backendRecordMap);

        if (keys.length != 0) {
            for (var i = 0; i < keys.length; i++) {

                var backendrecordKey = keys[i];
                var eachBackendData = AgentSetting.backendRecordMap[keys[i]];


                if (eachBackendData.cumCount > 0) {
                    //TODO : There should be monitorIntervalTime in place of 30
                    eachBackendData.rate = eachBackendData.invocationCount / 30;    // 30 is setInterval time for eachBTDataing data
                }

                if (eachBackendData.errorCumCount > 0) {
                    eachBackendData.errorRate = eachBackendData.errorInvocationCount / 30;
                }
                if (AgentSetting.isToInstrument && AgentSetting.dataConnHandler) {
                    vectorPrefix = AgentSetting.tierName + AgentSetting.ndVectorSeparator + AgentSetting.ndAppServerHost + AgentSetting.ndVectorSeparator + AgentSetting.appName + AgentSetting.ndVectorSeparator;
                    vectorPrefixID = AgentSetting.tierID + "|" + AgentSetting.appID + "|";
                    var data75 = AgentSetting.make75Data(eachBackendData);

                    util.logger.info("Dumping Backend record : " + data75);

                    AgentSetting.autoSensorConnHandler.write(data75);

                }
                eachBackendData.minDuration = Number.MAX_VALUE;
                eachBackendData.maxDuration = 0;

                eachBackendData.sumDuration = 0;
                eachBackendData.avgDuration = 0;


                //eachBackendData.cumCount = 0;
                eachBackendData.errorCumCount = 0;
                eachBackendData.invocationCount = 0;
                eachBackendData.errorInvocationCount = 0;

                eachBackendData.rate = 0;
                eachBackendData.errorRate = 0;

            }
        }
    }
    catch(err)
    {
        util.logger.warn("Error in Dumping BT record : " + err)
    }
}

AgentSetting.make75Data = function(data75){
    if(data75.minDuration == Number.MAX_VALUE)
    {
        data75.minDuration = 0;
    }
    return '75,' + vectorPrefixID + data75.backendID + ':' + vectorPrefix + data75.BackendName + '|' + data75.cumCount + ' ' + data75.rate + ' ' + data75.avgDuration + ' ' + data75.minDuration + ' ' + data75.maxDuration + ' ' + data75.invocationCount + ' ' + data75.errorRate + '\n';

}



AgentSetting.getBCIStartUpTime = function () {
    return AgentSetting.bciStartUpTime;

};
AgentSetting.getTierName = function () {
    return AgentSetting.tier;
};

AgentSetting.getServerName = function () {
    return AgentSetting.server;
};

AgentSetting.getInstance = function () {
    return AgentSetting.instance;
};

AgentSetting.getNDCHost = function () {
    return AgentSetting.ndcHost;
};

AgentSetting.getPort = function () {

    var port = AgentSetting.ndcPort;

    try {
        return parseInt(port);
    }
    catch (err) {
        return defaultNdcPort;
    }

};

module.exports = AgentSetting;