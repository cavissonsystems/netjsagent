/**
 * Created by bala on 22/7/15.
 */
var PropertiesReader = require('properties-reader');
var fs = require('fs');
var path = require('path');
var util = require('./util');
var Long = require('long');
var cluster = require('cluster');

var defaultTier = 'NodeJS';
var defaultServer = 'Nsecom';
var defaultInstance = 'Nsecom';
var defaultNdcPort = '7892';
var defaultNdcHost = 'localhost';
var os = require('os');
function AgentSetting() {}

AgentSetting.currentTestRun= 0 ;
AgentSetting.isTestRunning=false;
AgentSetting.cavEpochDiff=0;
AgentSetting.bciInstrSessionPct ;
AgentSetting.ndSettingFile = "NA" ;
AgentSetting.ndHome = "";
AgentSetting.settingFileMode = "";

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
                        }
                    });
                }catch(err){util.logger.warn(util.logger.warn+" | "+err)}
            });
        }
    }

}
AgentSetting.getBTData = function(filename)
{
    try {
        if (!fs.existsSync(filename)) {
            filename = path.resolve(__dirname) + '/BT/BTcategory';
            util.logger.info(AgentSetting.currentTestRun + " | BtCategory file is not present . ");

        }

        util.logger.info(AgentSetting.currentTestRun + " | Reading btCategory file : " + filename);
        var data = fs.readFileSync(filename).toString().split("\r\n");
        for (var i = 0; i < data.length; i++) {
            var BT = new Object();

            var dataValue = data[i].split("|");
            var url = dataValue[0];
            BT.slow = dataValue[1];
            BT.vryslow = dataValue[2];
            AgentSetting.categoryMap[url] = BT;
        }
    }
    catch(err){util.logger.warn(util.logger.warn+" | "+err)}
}

AgentSetting.initAllMap = function()
{
    try {
        AgentSetting.btrecordMap = new Object();
        AgentSetting.categoryMap = new Object();
        AgentSetting.backendRecordMap = new Object();
        //AgentSetting.backendMetaMap = new Object();
        AgentSetting.flowMap = new Object();
        //AgentSetting.queryMap = new Object();              //Query map for dumping meta query record (23)

        //AgentSetting.methodId = 0;
        AgentSetting.backendID = 0;
        AgentSetting.seqId = 0;
        //AgentSetting.queryId = 6;               //Every query has unique id & used to dump quey meta record(23) , starting from 6 because 1-6 id are reserved
    }
    catch(err){util.logger.warn(util.logger.warn+" | "+err)}

}

AgentSetting.generateFPMask = function()
{
    //For creating FP_ID
    //  "0x4000000000000000 +((0 &  0x0F) << 56)+ ((0 & 0x03FF) << 46)";
    try {
        var FP_shifting_56 = new Long(0x0F).and(0).shl(56);
        var FP_shifting_46 = new Long(0x03FF).and(0).shl(46);
        ;
        var flowPathInstanceInitial = new Long(0x00000000, 0x40000000).add(FP_shifting_46).add(FP_shifting_56);

        AgentSetting.flowPathInstanceInitialID = flowPathInstanceInitial.toString();
        AgentSetting.timeStampMask = parseInt('0x3FFFFFFFFF',16);
        AgentSetting.seqNoDigits = 8;
        AgentSetting.seqNumMask = parseInt('0xFF', 16);
    }catch(err){util.logger.warn(util.logger.warn+" | "+err)}


}

AgentSetting.setDefault = function () {
    AgentSetting.tier = defaultTier;
    AgentSetting.server = defaultServer;
    AgentSetting.instance = defaultInstance;
    AgentSetting.ndcPort = defaultNdcPort;
    AgentSetting.ndcHost = defaultNdcHost;

    //AgentSetting.enable_heapdump = 0;
    //AgentSetting.enable_cpu_profiling = 0
    AgentSetting.enable_eventLoop_monitor = 0
    AgentSetting.enable_garbage_profiler = 0

}

//This method is checking ,ndSetting file has been changed or not, if changed , recreate the connection
AgentSetting.checkNDSettingFile = function(settingFile)
{
    try {
        AgentSetting.isCluster();
        var stat = fs.statSync(settingFile);

        if ((stat.size == AgentSetting.lastModifiedSize) || (stat.mtime == AgentSetting.lastModifiedTime)) {
            return;
        }
        else{
            util.logger.info(AgentSetting.currentTestRun + " | ndSetting File is changed , reading it agin .");
            AgentSetting.getData(settingFile);           //getting data for making connection to ndc
        }
    }catch(err){util.logger.warn(util.logger.warn+" | "+err)};
};

AgentSetting.readSettingFile = function()
{
    if(AgentSetting.ndHome) {
        AgentSetting.ndSettingFile = path.join(AgentSetting.ndHome,'/ndsettings.conf')
    }
    else{
        AgentSetting.ndSettingFile = path.join(process.cwd(),'/ndsettings.conf');
    }
    AgentSetting.getData(AgentSetting.ndSettingFile);
}

AgentSetting.getData = function (filename) {

    try {
        util.logger.info(AgentSetting.currentTestRun+" | reading settings from : "+filename);
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
            util.logger.warn(AgentSetting.currentTestRun + " | Cannot read propery file due to : " + err);
            AgentSetting.setDefault();
            return AgentSetting;


        }
        util.logger.info(AgentSetting.currentTestRun + " | Setting configuration arguments from : " + filename);

        AgentSetting.tier = properties.get('tier');
        AgentSetting.server = properties.get('server');
        AgentSetting.instance = properties.get('instance');
        AgentSetting.ndcPort = properties.get('ndcPort');
        AgentSetting.ndcHost = properties.get('ndcHost');
        AgentSetting.settingFileMode = properties.get('Mode');

        if((AgentSetting.tier == null) || (AgentSetting.tier == 0) )
            AgentSetting.tier = "";
        if((AgentSetting.server == null) || (AgentSetting.server == 0) )
            AgentSetting.server = os.hostname();
        if((AgentSetting.instance == null) || (AgentSetting.instance == 0) )
            AgentSetting.instance = "";

        //AgentSetting.enable_heapdump = properties.get('heapDump');
        //AgentSetting.enable_cpu_profiling = properties.get('cpuProfiling');
        AgentSetting.enable_eventLoop_monitor = properties.get('eventLoopMonitor');
        AgentSetting.enable_garbage_profiler = properties.get('gcProfiler');

        util.logger.info(AgentSetting.currentTestRun + " | Tier is  : " + AgentSetting.tier);
        util.logger.info(AgentSetting.currentTestRun + " | Server is  : " + AgentSetting.server);
        util.logger.info(AgentSetting.currentTestRun + " | Instance is  : " + AgentSetting.instance);
        util.logger.info(AgentSetting.currentTestRun + " | NDCHost is  : " + AgentSetting.ndcHost);
        util.logger.info(AgentSetting.currentTestRun + " | NDCPort is  : " + AgentSetting.ndcPort);
        util.logger.info(AgentSetting.currentTestRun + " | eventLoopMonitor : " + AgentSetting.enable_eventLoop_monitor);
        util.logger.info(AgentSetting.currentTestRun + " | gcProfiler : " + AgentSetting.enable_garbage_profiler);

        return AgentSetting;
    }catch(err){util.logger.warn(util.logger.warn+" | "+err)}
};

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
