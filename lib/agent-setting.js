/**
 * Created by bala on 22/7/15.
 */
var PropertiesReader = require('properties-reader');
var fs = require('fs');
var path = require('path');
var util = require('./util');
var big_integer = require('./utils/BigInteger');
var cluster = require('cluster');
var StringBuffer = require('./flowpath/StringBuffer').StringBuffer;
var NDCServerConfig = require('./NDCServerConfig');
var defaultTier = 'NodeJS';
var defaultServer = 'Nsecom';
var defaultInstance = 'Nsecom';
var defaultNdcPort = '7892';
var defaultNdcHost = 'localhost';
//This variable used for enable/disable of dynamic threshold value for BTs
var NDHttpReqRespCaptureSettings = require('./HttpHeader/NDHttpReqRespCaptureSettings');
var cavNdSessionManager = require('./HttpHeader/cavNdSessionManager');
var os = require('os');
function AgentSetting() {}

var ENCODED_VAL_COMMA = "&#044;";
var ENCODED_VAL_NEW_LINE = "&#010;";
var ENCODED_VAL_SINGLE_QUOTE = "&#039;";
var ENCODED_VAL_DOUBLE_QUOTE = "&#034;";
var ENCODED_VAL_BACKSLASH = "&#092;";
var ENCODED_VAL_PIPE_SYMBOL = "&#124;";
var ENCODED_VAL_DOT_SYMBOL = "&#46;";
var ENCODED_VAL_COLON_SYMBOL = "&#58;";
var ENCODED_VAL_TO_SPACE = " ";

AgentSetting.appID=0;
AgentSetting.serverID=0;
AgentSetting.tierID=0;
AgentSetting.ndVectorSeparator='<';
AgentSetting.status=''              //Current status of message send by NDC like "nd_control_req:action=start_instrumentation;status=running;"
AgentSetting.nodejsCpuProfilingTime = 10000
AgentSetting.vectorPrefix = '';
AgentSetting.vectorPrefixID ='';
AgentSetting.vectorPrefixForNodeMonitors='';
AgentSetting.currentTestRun= 0 ;
AgentSetting.enableWraping = false;             //Wrapt instrumented code with try catch, default is disabled because it impacts on performance
AgentSetting.previousTestRun= 0 ;
AgentSetting.isTestRunning=false;
AgentSetting.cavEpochDiff=0;
AgentSetting.cavEpochDiffInMills = 1388534400000 ;
AgentSetting.continousRunningTest=false;                    //Flag to know continous test is running or not
AgentSetting.correlationIDHeader='';
AgentSetting.diffTimeFromNDC = 0;
AgentSetting.bciInstrSessionPct ;
AgentSetting.ndSettingFile = "NA" ;
AgentSetting.clusterMode = false;
AgentSetting.maxCharInSeqBlob = 600;                        //maximum metods to be process in a sequesce blob (A part of request)
AgentSetting.bciMaxNonServiceMethodsPerFP = 5000;           //maximum metods to be process in a flowpath (A complete request)
AgentSetting.enableForcedFPChain=1          //Enable Forced Flowpath Chain with modes 0- disable, 1- enable to not discard any child fp, 2- enable not to discard and also complete child flowpaths
AgentSetting.bciInstrSessionPct = 0;
AgentSetting.enableBTMonitor = 1;
AgentSetting.isBackendMonitorEnabled = true;
AgentSetting.startInstrResponse = false                 //Flag to check start_instrumentation reply is sent or not
AgentSetting.startInstrResTimeout = 60000
AgentSetting.runTimeChange = false;
AgentSetting.enableMultiInstMode=false;          //This keyword is use to capture data when app is running in cluster mode and autoscaling is disable
AgentSetting.protoversion = 1;
var envSettinfFile ;

var pathOfSettingFile = path.join('/opt/cavisson/netdiagnostics/ndsettings.conf');
var settingFileAccProject = path.resolve(path.join(__dirname,'/../../../ndsettings.conf'));
var builtinCoreModules = [ 'assert','buffer','child_process','cluster','crypto','dgram','dns','domain','events','fs','http','https','net','os','path','punycode','querystring', 'readline','stream','string_decoder','tls','tty','url','util','vm','zlib','smalloc' ];
AgentSetting.settingFileMode = "exclusive";
AgentSetting.normalModulesMap = {};
AgentSetting.monitorName = undefined ;
AgentSetting.ndMonitorInterval = 60000;

AgentSetting.RECORD_SEPRATOR_COMMA = ",";
AgentSetting.RECORD_SEPRATOR_SPACE = " ";
AgentSetting.THREAD_NAME = "Event Dispatch Thread";
AgentSetting.THREAD_STATE = "Running";
AgentSetting.THREAD_PRIORITY = "0";
AgentSetting.FUTURE_FIELDS = "0,0,0,0,0,";
AgentSetting.excludeMethodOnRespTime = 0;                //Keyword for method exclusion o basis of method resp time
AgentSetting.enableStateMC = true;
AgentSetting.dynamicThreshold = 0;
AgentSetting.enable_eventLoop_monitor = 1               //keyword to enable Event loop monitor
AgentSetting.enable_garbage_profiler = 1                //keyword to enable gc profiler
AgentSetting.BCILoggingMode = 'FILE'                    //Mode for logger o/p - FILE, CONSOLE_MODE, BOTH
AgentSetting.logLevel = 'debug';
AgentSetting.agentMode = 3 ;
AgentSetting.httpReqCapturingSettings = new NDHttpReqRespCaptureSettings();         //Settings object for request
AgentSetting.httpResCapturingSettings = new NDHttpReqRespCaptureSettings();         //Settings object for response
AgentSetting.invalidFileFormatMsg = true;
AgentSetting.maxBTCount = 256           //Max numbeCAV_APP_AGENT_NDC_COMM_PROTOCOLr of business transaction to be served, else will be matched to Others category
AgentSetting.bciDataBufferMaxCount = 512;
AgentSetting.bciDataBufferMaxSize = 32768;
AgentSetting.ASDataBufferSize = 64000;
AgentSetting.ASDataBufferMaxCount = 256;
AgentSetting.ndDataBufferSize=16777216;
AgentSetting.ndASBufferSize=16384000;
AgentSetting.isAsyncEventMonitorEnable = false;   //For Async Event Monitor
AgentSetting.enableUpdateLogMsgForNF=0;
AgentSetting.mapForWinstonLogMeths = {};
AgentSetting.mapForConsoleMeths = {};
AgentSetting.authtoken='';
AgentSetting.isSaaSServer = false;

//keywords for forcefully dump FPs
AgentSetting.dumpFPForcefullyTimer = undefined;
AgentSetting.FPMaxAllowedAgeInMillis = -1;
AgentSetting.forceFPDumpInterval = 90000;
AgentSetting.forceFPThresholdValue=20;

//All tracing keywords
AgentSetting.enableBTMonitorTrace = 0;
AgentSetting.enableBackendMonTrace= 0;
AgentSetting.ndMethodMonTraceLevel= 0;
AgentSetting.enableBciDebug= 0;
AgentSetting.captureHttpTraceLevel = 0;
AgentSetting.enableNDSession = new cavNdSessionManager();
AgentSetting.nodeServerMonitor = 0;
AgentSetting.healthCheckInterval = 60000;                    //At each Interval heartBeat will send
AgentSetting.healthCheckThreshold= 20                       //If NDC is not repling after n'th time then agent will disconnect connction
AgentSetting.reconnectTimer = undefined;                    //Timer that run to send health check message
AgentSetting.isHeapDumpInProgress = false;
AgentSetting.autoSensorConnHandler =undefined
AgentSetting.dataConnHandler =undefined
AgentSetting.lastModifiedSize = undefined;
AgentSetting.lastModifiedTime = undefined;
AgentSetting.corelateEventCallback = 0;
AgentSetting.wrapAsyncApi = false;
AgentSetting.filterHSEvents = undefined;
AgentSetting.enableHSLongStack = 0;
AgentSetting.isdumpBtMetaData = false;
AgentSetting.enableHSLongStackDepth = 5;
AgentSetting.isClusterMode = 0;                //cluster Mode Feature of NDC.
AgentSetting.requestType = 1;
AgentSetting.lastConnTimeStamp = 0;
AgentSetting.connDuration = 0;
AgentSetting.lastConnHost = '';
AgentSetting.lastConnPort = '';
AgentSetting.ndcHeartBeatThreshold = 15 * 60 * 1000 ;
AgentSetting.lastHeartBeatReceived = new Date().getTime();
AgentSetting.isAppNameSame = false;
AgentSetting.enableDumpAsyncId = 0;
AgentSetting.tDigestPercentileBT = {enable:0,aggInterval:'5m',sMode:2,delta:100,k:100,groupId:10793,graphId:1};
AgentSetting.tDigestPercentileIP = {enable:0,aggInterval:'5m',sMode:2,delta:100,k:100,groupId:10794,graphId:1};


AgentSetting.isCluster = function(){
    var instance ;

    var clusterPath = '/tmp/cavisson/cluster';
    if(!cluster.isMaster)
    {
        if(fs.existsSync(clusterPath)) {
            fs.readdir(clusterPath, function (err, files) {
                try {
                    if (err)util.logger.warn(err);
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
                }catch(err){util.logger.warn(err)}
            });
        }
    }
}

AgentSetting.initAllMap = function(args)
{
    try {
        AgentSetting.btrecordMap = new Object();
        AgentSetting.categoryMap = new Object();
        AgentSetting.backendRecordMap = new Object();
        AgentSetting.instrumentationMap = {};
        AgentSetting.coreInstrumentationMap= {};
        //AgentSetting.backendMetaMap = new Object();
        AgentSetting.flowMap = new Object();
        //AgentSetting.queryMap = new Object();              //Query map for dumping meta query record (23)

        //AgentSetting.methodId = 0;
        AgentSetting.backendID = 0;
        AgentSetting.seqId = 0;
        //AgentSetting.queryId = 6;               //Every query has unique id & used to dump quey meta record(23) , starting from 6 because 1-6 id are reserved

        AgentSetting.BCILoggingMode = args.BCILoggingMode;
        AgentSetting.logLevel = args.logLevel;
	    if(args.agentMode >=0  && args.agentMode <= 3)
		    AgentSetting.agentMode = args.agentMode
    }
    catch(err){util.logger.warn(err)}

}

AgentSetting.generateFPMask = function()
{
    //For creating FP_ID
    //  "0x4000000000000000 +((0 &  0x0F) << 56)+ ((0 & 0x03FF) << 46)";
    try {
        var FP_shifting_56 = (big_integer(big_integer('0x0F',16).and('0')).shiftLeft('56')).toString();
        var FP_shifting_46 = (big_integer(big_integer('0x03FF',16).and('0')).shiftLeft('46')).toString();

        var FP_data = (big_integer(FP_shifting_56).add(FP_shifting_46)).toString();
        var flowPathInstanceInitial = big_integer('4000000000000000',16).add(FP_data);

        AgentSetting.flowPathInstanceInitialID = flowPathInstanceInitial.toString();
        AgentSetting.timeStampMask = parseInt('0x3FFFFFFFFF',16);
        AgentSetting.seqNoDigits = 8;
        AgentSetting.seqNumMask = parseInt('0xFF', 16);

    }catch(err){util.logger.warn(err)}

}

AgentSetting.setDefault = function () {
    AgentSetting.tier = defaultTier;
    AgentSetting.server = defaultServer;
    AgentSetting.instance = defaultInstance;
    AgentSetting.ndcPort = defaultNdcPort;
    AgentSetting.ndcHost = defaultNdcHost;
    // saas parameters
    AgentSetting.tierAttributes = 'default_tierAttributes';
    AgentSetting.appname = 'default_appname';
    AgentSetting.endpointPrefix = 'default_endpointPrefix';
    AgentSetting.TierTag = 'default_TierTag';
    AgentSetting.AgentLoggingMode = 0 ;
    AgentSetting.ndSaasURL = null;
    AgentSetting.ndProjectKey = null;
    AgentSetting.isSaaSMode = false;


    //AgentSetting.enable_heapdump = 0;
    //AgentSetting.enable_cpu_profiling = 0
}

AgentSetting.parseInstrProfile = function(data){
    try {
        var instrData = JSON.parse(data);

        for (var i in instrData) {
            AgentSetting.instrumentationMap[instrData[i].modulename] = instrData[i];
            for (j in builtinCoreModules) {
                if (instrData[i].modulename === builtinCoreModules[j]) {
                    delete AgentSetting.instrumentationMap[instrData[i].modulename];
                    AgentSetting.coreInstrumentationMap[instrData[i].modulename] = instrData[i];
                }
            }
        }
    }
    catch(err){
        console.log(err)
    }
}

//This method is checking ,ndSetting file has been changed or not, if changed , recreate the connection
AgentSetting.checkNDSettingFile = function()
{
    util.logger.info("Checking setting file is changed or not .");
    try {

        //AgentSetting.isCluster();                 //This code is commenting because now we have autoscaling feature .
        var stat = fs.statSync(AgentSetting.ndSettingFile);

        if ((stat.size === AgentSetting.lastModifiedSize) && (stat.mtime.toString() === AgentSetting.lastModifiedTime.toString())) {
            util.logger.info(AgentSetting.currentTestRun + " | Size is same : " + stat.size + "==" + AgentSetting.lastModifiedSize + " , " + stat.mtime + "==" + AgentSetting.lastModifiedTime);
            return;
        }
        else {
            util.logger.info(AgentSetting.currentTestRun + " | ndSetting File is changed , Going to read ." + stat.size + "==" + AgentSetting.lastModifiedSize + " , " + stat.mtime + "==" + AgentSetting.lastModifiedTime);
            AgentSetting.lastModifiedSize = stat.size
            AgentSetting.lastModifiedTime = stat.mtime
            util.logger.info(AgentSetting.currentTestRun+" | reading settings from : "+AgentSetting.ndSettingFile+" . Size : "+stat.size+" , lmd : "+stat.mtime);
            AgentSetting.getData();           //getting data for making connection to ndc
        }
    }catch(err){util.logger.warn(err)};
};

AgentSetting.checkNDHome = function(){
    AgentSetting.ndHome = process.env.ndHome ?  process.env.ndHome : undefined;
    util.logger.info(AgentSetting.currentTestRun+" | NDHome is : "+AgentSetting.ndHome)
    if(AgentSetting.ndHome !== undefined ) {
        envSettinfFile = path.join(AgentSetting.ndHome, '/ndsettings.conf');
    }
    return envSettinfFile;
}

function isEmpty(val){
    return (val === undefined || val == null || val == 0 || val.length <= 0)  ? true : false;
}
AgentSetting.checkNDSettingsInEnv = function(){
    var ndc_host= process.env.CAV_APP_AGENT_NDCHOST;
    var ndc_port = process.env.CAV_APP_AGENT_NDCPORT;
    var pr_key = process.env.CAV_APP_AGENT_NDPROJECTKEY;
    if(!isEmpty(pr_key) || (!isEmpty(ndc_host) && !isEmpty(ndc_port)))
    {   //@ the end this if is returning true and else is returning false

        AgentSetting.ndcHost = process.env.CAV_APP_AGENT_NDCHOST;
        AgentSetting.ndcPort = process.env.CAV_APP_AGENT_NDCPORT;
        AgentSetting.tier = process.env.CAV_APP_AGENT_TIER;
        AgentSetting.server = process.env.CAV_APP_AGENT_SERVER;
        AgentSetting.instance = process.env.CAV_APP_AGENT_INSTANCE;
        AgentSetting.backupNdcHostName = process.env.CAV_APP_AGENT_BACKUPNDCHOSTNAME;
        AgentSetting.backupNdcPort = process.env.CAV_APP_AGENT_BACKUPNDCPORT;
        AgentSetting.protocols = process.env.CAV_APP_AGENT_NDC_COMM_PROTOCOL;
        AgentSetting.tierAttributes = process.env.CAV_APP_AGENT_TIERATTRIBUTES;
        AgentSetting.appname = process.env.CAV_APP_AGENT_APPNAME;
        AgentSetting.endpointPrefix = process.env.CAV_APP_AGENT_ENDPOINTPREFIX;
        AgentSetting.TierTag = process.env.CAV_APP_AGENT_TIERTAG;
        AgentSetting.ndProjectKey = process.env.CAV_APP_AGENT_NDPROJECTKEY;
        AgentSetting.ndSaasURL = process.env.CAV_APP_AGENT_NDSAASURL;
        AgentSetting.AgentLoggingMode = process.env.CAV_APP_AGENT_AGENTLOGGINGMODE;
        util.logger.info(AgentSetting.currentTestRun + " | -----------Reading Settings from environment------------- ");
        util.logger.info(AgentSetting.currentTestRun + " | NDCHost is  : " + AgentSetting.ndcHost);
        util.logger.info(AgentSetting.currentTestRun + " | NDCPort is  : " + AgentSetting.ndcPort);
        util.logger.info(AgentSetting.currentTestRun + " | tier is  : " + AgentSetting.tier);
        util.logger.info(AgentSetting.currentTestRun + " | server is  : " + AgentSetting.server);
        util.logger.info(AgentSetting.currentTestRun + " | instance is  : " + AgentSetting.instance);
        util.logger.info(AgentSetting.currentTestRun + " | backupNdcHostName is  : " + AgentSetting.backupNdcHostName);
        util.logger.info(AgentSetting.currentTestRun + " | backupNdcPort is  : " + AgentSetting.backupNdcPort);
        util.logger.info(AgentSetting.currentTestRun + " | protocols is  : " + AgentSetting.protocols);
        util.logger.info(AgentSetting.currentTestRun + " | tierAttributes is  : " + AgentSetting.tierAttributes);
        util.logger.info(AgentSetting.currentTestRun + " | appname is  : " + AgentSetting.appname);
        util.logger.info(AgentSetting.currentTestRun + " | endpointPrefix is  : " + AgentSetting.endpointPrefix);
        util.logger.info(AgentSetting.currentTestRun + " | TierTag is  : " + AgentSetting.TierTag);
        util.logger.info(AgentSetting.currentTestRun + " | ndProjectKey is  : " + AgentSetting.ndProjectKey);
        util.logger.info(AgentSetting.currentTestRun + " | ndSaasURL is  : " + AgentSetting.ndSaasURL);
        util.logger.info(AgentSetting.currentTestRun + " | AgentLoggingMode is  : " + AgentSetting.AgentLoggingMode);



        if(!isEmpty(pr_key))
        {
            util.logger.info(AgentSetting.currentTestRun + " Enabeling SaaS Mode as Project Key found ");
            AgentSetting.isSaaSMode = true;
            AgentSetting.isSaaSServer = true;
            AgentSetting.isClusterMode = 1;
            if(AgentSetting.protocols===undefined){
                AgentSetting.protocols ='wss';
                util.logger.info(AgentSetting.currentTestRun + " | Protocol is not defined so using default WSS");
            }
            if(!isEmpty(AgentSetting.ndSaasURL)){             // if URL is provided
                var ar=AgentSetting.ndSaasURL.split(':');
                AgentSetting.SaasHost = ar[0];
                if(ar[1]===undefined)  {            //Port is not available in URL
                    AgentSetting.SaasPort = 443; // setting default value if port is not provided in saas url
                    util.logger.info(AgentSetting.currentTestRun + " | port is not present so using default port 443" );
                }
                else
                    AgentSetting.SaasPort = ar[1];
            }
            else{                                       //if URL is not provided even it is SaaS Mode
                AgentSetting.SaasHost = 'app.cavisson.com';
                AgentSetting.SaasPort = 443;
                util.logger.info(AgentSetting.currentTestRun + " | SaaS URL not found so using default app.cavisson.com:443" );
            }
            util.logger.info(AgentSetting.currentTestRun + " | SaasHost is  : " + AgentSetting.SaasHost);
            util.logger.info(AgentSetting.currentTestRun + " | SaasPort is  : " + AgentSetting.SaasPort);
        }

        return true
    }
    else
        return false


}
AgentSetting.readSettingFile = function()
{

    try {
         if(this.checkNDSettingsInEnv()) {
            if((AgentSetting.ndcHost == null) || (AgentSetting.ndcHost == undefined) || (AgentSetting.ndcHost == 0)) {
                AgentSetting.ndcHost = '';
                util.logger.error(AgentSetting.currentTestRun + " | ndcHost is not present in ndsetting file , so setting it to default ");
            }
            if((AgentSetting.ndcPort == null) || (AgentSetting.ndcPort == undefined) || (AgentSetting.ndcPort == 0)) {
                AgentSetting.ndcPort = defaultNdcPort;
                util.logger.error(AgentSetting.currentTestRun + " | ndcPort is not present in ndsetting file , so setting it to default" );
            }
            NDCServerConfig.resetserverlist();
            if(AgentSetting.isSaaSMode){
                NDCServerConfig.addServers([{host:AgentSetting.SaasHost,port:AgentSetting.SaasPort,type:1,protocols:AgentSetting.protocols,isSaaSserver:AgentSetting.isSaaSServer}])
            }
            else{
                NDCServerConfig.addServers([{host:AgentSetting.ndcHost,port:AgentSetting.ndcPort,type:1,protocols : AgentSetting.protocols,isSaaSserver:AgentSetting.isSaaSServer},{host:AgentSetting.backupNdcHostName,port:AgentSetting.backupNdcPort,type:0,protocols : AgentSetting.protocols,isSaaSserver:AgentSetting.isSaaSServer}])
            }
         }

        else if(fs.existsSync(settingFileAccProject) && util.canWrite(settingFileAccProject)){
            AgentSetting.ndSettingFile = settingFileAccProject;
            util.logger.info(AgentSetting.currentTestRun+" | path acc to project : "+AgentSetting.ndSettingFile);
            this.checkNDSettingFile();
        }
        else if (fs.existsSync(pathOfSettingFile) && util.canWrite(pathOfSettingFile)) {
            AgentSetting.ndSettingFile = pathOfSettingFile;
            util.logger.info(AgentSetting.currentTestRun+" | NDHome is not set , so taking default path: "+AgentSetting.ndSettingFile);
            this.checkNDSettingFile();
        }
        else if(fs.existsSync(this.checkNDHome()) && util.canWrite(envSettinfFile)) {
            AgentSetting.ndSettingFile = envSettinfFile;
            util.logger.info(AgentSetting.currentTestRun+" | NDHome is set : "+AgentSetting.ndHome+" ,and file path is : "+AgentSetting.ndSettingFile);
            this.checkNDSettingFile();
        }
        else{
            util.logger.error(AgentSetting.currentTestRun+ " | No NdSetting file is prsent on server");
            AgentSetting.ndSettingFile = AgentSetting.lastModifiedSize = AgentSetting.lastModifiedTime = undefined;
            return;
        }
    }
    catch(err)
    {util.logger.warn(err)}
};

AgentSetting.getData = function () {

    try {
        var filename= AgentSetting.ndSettingFile

        AgentSetting.isToInstrument = false;    // It will true when control connection has made.
        AgentSetting.isRequested = false;       //check only for http requests
        AgentSetting.bciStartUpTime = new Date().getTime();

        var properties = null;
        try {
            properties = PropertiesReader(filename);
        }
        catch (err) {
            util.logger.warn(AgentSetting.currentTestRun + " | Cannot read propery file due to : " + err);
            return ;
        }
        util.logger.info(AgentSetting.currentTestRun + " | -----------Reading Settings ndsettings.conf------------- ");
        var tier = properties.get('tier');
        var server = properties.get('server');
        var instance = properties.get('instance');
        var ndcPort = properties.get('ndcPort');
        var ndcHost = properties.get('ndcHost');
        var backupNdcHostName = properties.get('backupNdcHostName');
        var backupNdcPort = properties.get('backupNdcPort');
        var agentMode = properties.get('agentMode');
        var enableStateMC = properties.get('enableStateMC')
        var excludeMethodOnRespTime = properties.get('excludeMethodOnRespTime');
        var dynamicThreshold = properties.get('dynamicSlowVslowThreshold');
        var enableWraping = properties.get('enableWraping');
        AgentSetting.enableWraping = (enableWraping === true) ? true : false ;
        var corelateEventCallback = properties.get('corelateEventCallback');
        var enableHSLongStackDepth = properties.get('enableHSLongStackDepth');
        AgentSetting.setCorelateEventCBValue(corelateEventCallback);
        var filterHSEvents = properties.get('filterHSEvents');
        var protocols = properties.get('NDC_COMM_PROTOCOL');        //All supported protocols passed in ndsetting (ws/wss/tcp)
        var Mode = properties.get('Mode');

        AgentSetting.protocols = protocols;
        AgentSetting.ndcPort = ndcPort;
        AgentSetting.ndcHost = ndcHost;

        // new prameters added at the time of SAAS
        var tierAttributes =  properties.get('tierAttributes');
        var appname = properties.get('appname');
        var endpointPrefix = properties.get('endpointPrefix');
        var TierTag = properties.get('TierTag');
        var ndSaasURL = properties.get('ndSaasURL');
        var ndProjectKey = properties.get('ndProjectKey');
        var AgentLoggingMode = properties.get('AgentLoggingMode');
        AgentSetting.tierAttributes = tierAttributes;
        AgentSetting.appname = appname;
        AgentSetting.endpointPrefix = endpointPrefix;
        AgentSetting.TierTag = TierTag;
        AgentSetting.AgentLoggingMode = AgentLoggingMode;


        if(!isEmpty(ndProjectKey))
        {
            util.logger.info(AgentSetting.currentTestRun + " | Enabeling SaaS Mode as Project Key Found ");
            AgentSetting.isSaaSMode = true;
            AgentSetting.isSaaSServer = true;
            AgentSetting.isClusterMode = 1;
            AgentSetting.ndProjectKey = ndProjectKey;
            if(protocols === undefined){ //for SaaS mode if protocol is not defined
                protocolsv = 'wss';
                util.logger.info(AgentSetting.currentTestRun + " | Protocol is not defined so using default WSS ");
            }
            if(!isEmpty(ndSaasURL)) {    // if SaaS URL is available
                AgentSetting.ndSaasURL = ndSaasURL;
                var ar=AgentSetting.ndSaasURL.split(':');
                AgentSetting.SaasHost = ar[0];
                if(ar[1]===undefined) {           // if SaaS Port is not provided in URL
                    AgentSetting.SaasPort = 443;
                    util.logger.info(AgentSetting.currentTestRun + " | Port is not defined in SaaS URL so using default 443 ");
                }
                else
                    AgentSetting.SaasPort = ar[1];
            }
            else{                               //if URL is not provided even it is SaaS Mode
                AgentSetting.SaasHost = 'app.cavisson.com';
                AgentSetting.SaasPort = 443;
                util.logger.info(AgentSetting.currentTestRun + " | Protocol is not defined so using default WSS ");
            }
        }


        if(Mode != undefined && Mode != null && Mode != 0){
            if(Mode.toUpperCase() == 'SHARED'){
                AgentSetting.clusterMode = true ;
                AgentSetting.settingFileMode = Mode ;
            }
        }

        if((AgentSetting.ndcHost == null) || (AgentSetting.ndcHost == undefined) || (AgentSetting.ndcHost == 0)) {
            AgentSetting.ndcHost = '';
            util.logger.error(AgentSetting.currentTestRun + " | ndcHost is not present in ndsetting file , so setting it to default : " + filename);
        }
        if((AgentSetting.ndcPort == null) || (AgentSetting.ndcPort == undefined) || (AgentSetting.ndcPort == 0)) {
            AgentSetting.ndcPort = defaultNdcPort;
            util.logger.error(AgentSetting.currentTestRun + " | ndcPort is not present in ndsetting file , so setting it to default: " + filename);
        }

        NDCServerConfig.resetserverlist(NDCServerConfig.addServers);
        if(AgentSetting.isSaaSMode){
            NDCServerConfig.addServers([{host:AgentSetting.SaasHost,port:AgentSetting.SaasPort,type:1,protocols:AgentSetting.protocols,isSaaSserver:AgentSetting.isSaaSServer}]);

        }
        else{
            NDCServerConfig.addServers([{host:AgentSetting.ndcHost,port:AgentSetting.ndcPort,type:1,protocols:AgentSetting.protocols,isSaaSserver:AgentSetting.isSaaSServer},{host:backupNdcHostName,port:backupNdcPort,type:0,protocols : AgentSetting.protocols,isSaaSserver:AgentSetting.isSaaSServer}])
        }

        AgentSetting.enableMultiInstMode=properties.get('enableMultiInstMode');
	    if(enableHSLongStackDepth !== undefined && enableHSLongStackDepth !== null && enableHSLongStackDepth > 0){
            AgentSetting.enableHSLongStackDepth = enableHSLongStackDepth
        }
	    if(agentMode !== undefined && agentMode !== null && agentMode >= 0 && agentMode <=3 ){
    		AgentSetting.agentMode = agentMode;
	    }
        if(filterHSEvents != undefined && filterHSEvents != null && filterHSEvents != 0)
            AgentSetting.filterHSEvents = filterHSEvents;

        AgentSetting.dynamicThreshold = dynamicThreshold;
        if((AgentSetting.dynamicThreshold == null) || (AgentSetting.dynamicThreshold == undefined) || (AgentSetting.dynamicThreshold == 0)){
            AgentSetting.dynamicThreshold = 0;
        }
        if((AgentSetting.enableMultiInstMode == null) || (AgentSetting.enableMultiInstMode == undefined) || (AgentSetting.enableMultiInstMode == 0)){
            AgentSetting.enableMultiInstMode = false;
        }
        AgentSetting.enableStateMC = enableStateMC
        if(AgentSetting.enableStateMC == null || AgentSetting.enableStateMC == undefined || ( AgentSetting.enableStateMC === 1)){
            AgentSetting.enableStateMC = true;
        }
        AgentSetting.excludeMethodOnRespTime = excludeMethodOnRespTime;
        if(AgentSetting.excludeMethodOnRespTime == null || AgentSetting.excludeMethodOnRespTime == undefined){
            AgentSetting.excludeMethodOnRespTime = 0
        }
        AgentSetting.backupNdcHostName = backupNdcHostName;
        AgentSetting.backupNdcPort = backupNdcPort;


        if(AgentSetting.settingFileMode.toUpperCase() == "SHARED"){
            if(!AgentSetting.tier)
                AgentSetting.tier =tier;
            if(!AgentSetting.server)
                AgentSetting.server =server;
            if(!AgentSetting.instance)
                AgentSetting.instance = instance;
        }
        else{
            AgentSetting.tier = tier;
            AgentSetting.server = server;
            AgentSetting.instance = instance;
        }

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
        util.logger.info(AgentSetting.currentTestRun + " | Mode : " + AgentSetting.settingFileMode);
        util.logger.info(AgentSetting.currentTestRun + " | EnableStateMC : ", AgentSetting.enableStateMC );
        util.logger.info(AgentSetting.currentTestRun + " | dynamicSlowVslowThreshold : " + AgentSetting.dynamicThreshold);
        util.logger.info(AgentSetting.currentTestRun + " | ExcludeMethodOnRespTime : " + AgentSetting.excludeMethodOnRespTime);
        util.logger.info(AgentSetting.currentTestRun + " | agentMode : " + AgentSetting.agentMode);
        util.logger.info(AgentSetting.currentTestRun + " | backupNdcHostName : " + AgentSetting.backupNdcHostName);
        util.logger.info(AgentSetting.currentTestRun + " | backupNdcPort : " + AgentSetting.backupNdcPort);
        util.logger.info(AgentSetting.currentTestRun + " | corelateEventCallback : " + corelateEventCallback);
        util.logger.info(AgentSetting.currentTestRun + " | enableHSLongStackDepth : " + enableHSLongStackDepth);
        util.logger.info(AgentSetting.currentTestRun + " | filterHSEvents : " + AgentSetting.filterHSEvents);
    }catch(err){util.logger.warn(err)}
};

AgentSetting.setCorelateEventCBValue = function(value){
    if((value == null) || (value == undefined) || (value == 0)){
        AgentSetting.corelateEventCallback = 0;
    }
    else {
        if(value.toString().indexOf('%') > -1) {
            var tmp = value.toString().split('%')
            if (tmp[0] >= 0) {
                AgentSetting.corelateEventCallback = tmp[0]
                AgentSetting.wrapAsyncApi = tmp[1] > 0 ? true : false
            }
        }else{
            AgentSetting.corelateEventCallback = value;
            AgentSetting.wrapAsyncApi=false
        }
    }
}

AgentSetting.setEnableHSLongStackValue = function(value){

    if(value == undefined && value == null){
        return
    }
    else if(value){

        var temp = value.toString().split('%')
        if(temp.length > 2){
            AgentSetting.enableHSLongStack = temp[0]
            AgentSetting.enableHSLongStackDepth = temp[1]
            AgentSetting.filterHSEvents = temp[2]
        }
        if(temp.length > 1){
            AgentSetting.enableHSLongStack = temp[0]
            AgentSetting.enableHSLongStackDepth =temp[1]
        }
        if(temp.length > 0){
            AgentSetting.enableHSLongStack = temp[0]
        }
    }
    util.logger.info("0 | EnableHSLongStack : "+AgentSetting.enableHSLongStack ,AgentSetting.enableHSLongStackDepth ,AgentSetting.filterHSEvents);
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

AgentSetting.getSaasHost = function(){
    return AgentSetting.SaasHost;
}
AgentSetting.getTierAttributes = function(){
    return AgentSetting.tierAttributes;
};

AgentSetting.getappname = function (){
    return AgentSetting.appname;
};

AgentSetting.getendpointPrefix = function(){
    return AgentSetting.endpointPrefix;
};

AgentSetting.getAgentInfo = function () {
    util.logger.info(AgentSetting.currentTestRun, "| RunTime change for Agent info------>")
    var arr =[]
    for(var i in AgentSetting) {
        arr.push(i+'='+AgentSetting[i])
    }
    util.logger.info(arr)
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

AgentSetting.getFlowPathIdFromRequest= function(){
    var getNamespace = require('./utils/continuation-local-storage').getNamespace,
    namespace = getNamespace('cavissonNamespace');
    if(!namespace)
        return ;

    var requestedObj = namespace.get('httpReq');
    return requestedObj;

};
var localStorage = require('./utils/continuation-local-storage');
AgentSetting.isInstrumentTx = function(context){
    return (localStorage && localStorage.getNamespace('cavissonNamespace') && (context=localStorage.getNamespace('cavissonNamespace').get('httpReq'))&&
        localStorage.getNamespace('cavissonNamespace').get('httpReq').cavIncludeFp);
}


AgentSetting.getContextObj = function () {
    //var localStorage = require('./utils/continuation-local-storage');
    return localStorage && localStorage.getNamespace('cavissonNamespace') && localStorage.getNamespace('cavissonNamespace').get('httpReq');
}

AgentSetting.encodeURI = function(sb,command){
    var len = command.length;
    for(var i=0; i<len; i++){
        var c = command.charAt(i);
        switch (c){
            case ',':
                sb.add(ENCODED_VAL_COMMA);
                break;
            case '\n':
                sb.add(ENCODED_VAL_NEW_LINE);
                break;
            case '\'':
                sb.add(ENCODED_VAL_SINGLE_QUOTE);
                break;
            case '\"':
                sb.add(ENCODED_VAL_DOUBLE_QUOTE);
                break;
            case '\\':
                sb.add(ENCODED_VAL_BACKSLASH);
                break;
            case '|':
                sb.add(ENCODED_VAL_PIPE_SYMBOL);
                break;
            default:
                sb.add(c);
                break;
        }
    }
    return sb ;
}



AgentSetting.checkforCorrelationIdInReqRes = function (reqOrResObj, flowpathObj) {
    try {
        if (reqOrResObj) {
            var correlationId = (reqOrResObj.headers && (reqOrResObj.headers[AgentSetting.correlationIDHeader.toLowerCase()] ||
                reqOrResObj.headers[AgentSetting.correlationIDHeader]) || reqOrResObj.getHeader &&
                (reqOrResObj.getHeader(AgentSetting.correlationIDHeader.toLowerCase()) ||
                reqOrResObj.getHeader(AgentSetting.correlationIDHeader)));

            if (correlationId && flowpathObj) {
                var sb = new StringBuffer();
                flowpathObj.correlationIDHeader = AgentSetting.encodeURI(sb, correlationId).toString()
                sb.clear();
            }
        }
    }catch(err){util.logger.warn(AgentSetting.currentTestRun, "| Error occured when getting Co-rrelation id from Request or Response.")}
}

AgentSetting.escapeHTMLForBackend = function(backendName){
    try{
        var encodedStr = []
        for(var i in backendName){
            var c = backendName.charAt(i)
            switch (c){
                case ' ':encodedStr[i] = '-'
                    break;;
                case '\n':encodedStr[i] = '-'
                    break;
                case '\'':encodedStr[i] = '&#039;'
                    break;
                case '\"':encodedStr[i] = '&#034;'
                    break;
                case '\\':encodedStr[i] = '&#092;'
                    break;
                case '|':encodedStr[i] = '&#124;'
                    break;
                case '.':encodedStr[i] = '&#46;'
                    break;
                case ':':encodedStr[i] = '&#58;'
                    break;
                default : encodedStr[i] = c
            }
        }
        return encodedStr.join('');
    }catch(e){
        util.logger.error('Error while Encoding the Backend Name',e)
    }
}

module.exports = AgentSetting;
