/*
 * Created by bala on 23/7/15.
 */
var agentConfReader = require("./agent-setting");
var flowpathHandler = require("./flowpath-handler");
var dataConnectionHandler = require("./dataconnection-handler");
var AutoSensorConnectionHandler = require('./autoSensorConnection-handler');
var ndMetaDataRecoveryProcess = require('./metaData/ndMetaDataRecoveryProcess');
var eventLoopMonitor = require('./event_loop_moitor/ndEventLoopMonitor.js');
var heapGcMonitor = require('./heap_gc_monitor/ndHeapGCMonitor.js')
var ndBTMonitor = require('./BT/ndBTMonitor.js')
var ndBackendMonitor = require('./backend/ndBackendMonitor.js');
var backendRecord = require('./backend/backendRecord.js');
var ndMethodMetaData =  require('./metaData/ndMethodMetaData');
var ndSQLMetaData = require('./metaData/ndSQLMetaData');
var ndMethodMonitor = require('./method-monitor/ndMethodMonitor.js');
var btGlobalRule = require ('./BT/btGlobalRule.js');
var NDHttpCaptureSettings = require('./HttpHeader/NDHttpCaptureSettings.js');
var NDHttpConditionStats = require('./HttpHeader/NDHttpConditionStats.js');
var NDSessionCaptureSettings = require('./HttpHeader/NDSessionCaptureSettings.js');
var v8_profiler = require('./v8-profiler');
var path = require('path');
var util = require('./util');
var fs = require('fs');
var btConfig = require('./BT/btConfig');
var btManager = require('./BT/btManager.js');
var btRuleList = require('./BT/btPatternRule.js')
var asMangerObj = require('./autoSensor/autoSensorManager'); //Requiring ASManager object, this file controls all AS events
var otherKeywordHandler = require('./handleOtherKeywords'); //Requiring OhandleOtherKeywords object ,handling of all keywords other than file based keyword.
var asSettingObj = require('./autoSensor/autoSensorSetting'); //Requiring ASSetting object ,all keywords of AS are assigned in this file
var lastHeapdumpReqTime = "";
var instPrfParseobj = require('./instrProfileParser');
var fileBasedKeywordGenricFile = require('./ndFileBasedKeywordHandler');
var execSync = require('child_process').execSync;
var os = require('os');
var isAgentLess = 'Y'
var big_integer = require('./utils/BigInteger');
var ndExceptionCaptureSettings = require('./exception/ndExceptionCaptureSettings');
var ndExceptionMonitor = require('./exception/ndExceptionMonitor');
var serverMonitor = require('./nodeServerMonitor/serverMonitor');
var ndAsyncMonitor = require('./eventMonitor/ndAsyncEventMonitor');
var serverConfig = require("./NDCServerConfig");
var startInstrProcessing = false,
    recoonectCount = 0,
    healthCheckReplyCount = -1,
    healthCheckReply = false,
    Active= 1,
    Backup= 0,
    connectWithoutWait=0;

function MessageHandler(clientSocket)
{
    this.clientSocket = clientSocket;
    this.handleMessages();
}

MessageHandler.prototype.setClientSocket = function(socket) {
    this.clientSocket = socket;
}

MessageHandler.prototype.sendIntialMessages = function() {

    var machineType = os.type(),
        machine;

    if(machineType && machineType.indexOf('Windows') > -1){
        var data = execSync('tasklist').toString();
        machine = 'win';
        if(data.indexOf('CavMonAgent') > -1)
            isAgentLess = 'N';
    }
    if(machineType && machineType.indexOf('Linux') > -1) {
        var data = execSync('ps -ef |grep cmon').toString();
        machine = machineType+"Ex"
        if (data.indexOf('CavMonAgent') > -1)
            isAgentLess = 'N';
    }
    var processId = process.pid;

    var controlMessage = "nd_ctrl_msg_req:appName=" + agentConfReader.getInstance() + ";ndAppServerHost="
        + agentConfReader.getServerName() + ";tierName=" + agentConfReader.getTierName() + ";bciVersion="+util.netjsagentVersion
        + ";bciStartTime=" + agentConfReader.getBCIStartUpTime() + ";ndHome=" + process.cwd() + ";pid=" + processId
        +";BCITimeStamp="+ new Date().getTime() + ";serverIp="+this.clientSocket.localAddress+ ";hostName="+os.hostname()
        + ";isAgentLess="+ isAgentLess+ ";jvmType=NodeJS"+ ";javaVersion="+process.version
        + ";javaHome="+process.cwd()+ ";machineType="+machine+";agentType=NodeJS;"+"\n";
       // + ";javaHome="+process.cwd()+ ";machineType="+os.type()+"Ex;"+"\n";
       // + ";javaHome="+process.cwd()+ ";machineType="+os.type()+"Ex"+";agentType=NodeJS;"+"\n";

   /* var controlMessage = "nd_ctrl_msg_req:appName=" + agentConfReader.getInstance() + ";ndAppServerHost="
        + agentConfReader.getServerName() + ";tierName=" + agentConfReader.getTierName() + ";bciVersion=VERSION 4.1.2.Local BUILD 18"
        + ";bciStartTime=" + agentConfReader.getBCIStartUpTime() + ";ndHome=/opt/cavisson/netdaignostic;pid=" + processId + "\n";
*/

    util.logger.info(agentConfReader.currentTestRun+" | Message send to ndc : "+controlMessage);
    this.clientSocket.write(controlMessage);

    agentConfReader.runTimeChange = false ;startInstrProcessing = false
}

function resetMonitorCounters(){
    try {
        util.logger.info(agentConfReader.currentTestRun + " | Reseting all monitor Counters");
        btManager.resetMonitorCounters();
        ndMethodMonitor.resetMonitorCounters();
        NDHttpConditionStats.resetMonitorCounters();
        ndExceptionMonitor.resetMonitorCounter();
    }catch(err){util.logger.error(err)}
}

//Used to accumulate incomplete messages received in socket
function closeDataAutoConnections(){
    try {
        if (agentConfReader.dataConnHandler) {           //Checking is dataConnHandler
            agentConfReader.dataConnHandler.closeConnection();
            delete agentConfReader.dataConnHandler;
        }
        if (agentConfReader.autoSensorConnHandler) {             //Checking is autoSensorConn
            agentConfReader.autoSensorConnHandler.closeConnection();
            delete agentConfReader.autoSensorConnHandler;
        }
    }catch(err){util.logger.error(err)}
}

function stopAllMonitors(){
    try {
        util.logger.info(agentConfReader.currentTestRun + " | Clearing all Monitors ");
        asMangerObj.stopMonitor();  //Stopping AS monitor from dumping 53 records.

        //Stop all runing monitor's intervalTimer
        ndAsyncMonitor.stop(); //Handling Asynchronous event trace
        heapGcMonitor.stopHeapGC();
        eventLoopMonitor.stopEvnetloopMonitor();
        NDHttpConditionStats.stopHttpConditioMonitor();
        ndBackendMonitor.stopBackendMonitor();
        ndBTMonitor.stopBTMonitor();
        ndMethodMonitor.stopMethodMonitor();
        ndExceptionMonitor.stopExceptionMonitor();
        serverMonitor.stopServerMonitor();
    }catch(err){util.logger.error(err)}
}

function makeDataAutoConnection(){
    try {
        stopAllMonitors()
        closeDataAutoConnections();
        agentConfReader.dataConnHandler = new dataConnectionHandler();
        agentConfReader.dataConnHandler.createDataConn(serverConfig.currentActiveServer);

        agentConfReader.autoSensorConnHandler = new AutoSensorConnectionHandler();
        agentConfReader.autoSensorConnHandler.createAutoSensorConn(serverConfig.currentActiveServer);

        if (agentConfReader.dataConnHandler && agentConfReader.autoSensorConnHandler) {
            eventLoopMonitor.handleEventLoopMonitor();
            heapGcMonitor.handleHeapGcMonitor();

            ndBackendMonitor.handleBackendMonitor();
            ndBTMonitor.handleBtMonitor();
            ndMethodMonitor.startMethodMonitor();
            ndExceptionMonitor.startExceptionMonitor();
            NDHttpConditionStats.startHttpConditioMonitor();
            serverMonitor.handleServerMonitor();
            ndAsyncMonitor.handleAsyncEventMonitor(); //Handling Asynchronous event trace
            if (asSettingObj.asSampleInterval > 0) {
                asMangerObj.startMonitor();   //Starting AS monitor for dumping 53 records on basis of reportInterval keyword
            }

        }
        startInstrProcessing = false, agentConfReader.runTimeChange = false;
        instPrfParseobj.resetInstrListOnStart();        //Clearing instrumentation & File base keyword array
        metaData = {data: ''}, expectedFileMetaData = {size: 0}
    }catch(err){util.logger.error(err)}
}
function calculateDataBufferLength(bufferSize,BufferCount){
    agentConfReader.ndDataBufferSize = parseInt(bufferSize * BufferCount)
    util.logger.info(agentConfReader.currentTestRun,"| ndDataBufferSize : ",agentConfReader.ndDataBufferSize)
}
function calculateASLength(bufferSize,BufferCount){
    agentConfReader.ndASBufferSize = parseInt(bufferSize * BufferCount)
    util.logger.info(agentConfReader.currentTestRun,"| ndASBufferSize : ",agentConfReader.ndASBufferSize)
}

var pendingChunk = "",expectedFileMetaData ={},metaData = {data:''};

MessageHandler.prototype.handleMessages = function() {
    var clientSocket = this.clientSocket;
    //Rest complete state on creating new control connection with default values-
    pendingChunk = "";

    clientSocket.on("data", function (content) {
        var findEOL = false;
        var data= content.toString();
        try {
            if(expectedFileMetaData.size > 0) {                 //Parsing file content coming from NDC
                var fileData=''
                if(data.trim().startsWith("nd_ctrl_msg_") || data.trim().startsWith("nd_control_") ||
                    data.trim().startsWith("nd_meta_data_")) {
                    healthCheckReply = true;
                    var first = data.indexOf("\n");
                        fileData = data.substring(first+1,data.length);
                }
                else{
                    fileData = data;
                }
                MessageHandler.readFileContent(fileData,clientSocket);
            }
            //1. One or more  complete messages received
            //2. Multiple complete messsages received except last
            //3. One incomplete message received

            if(data.toString().indexOf('\n') > -1) {
                findEOL = true;
                if(pendingChunk != "") {
                    data = pendingChunk+data.toString();
                }
                pendingChunk="";
                var last = data.toString().lastIndexOf("\n");
                if (last!==data.toString().length-1) {
                    var second =data.toString().substring(last+1);
                    if(second) {
                        pendingChunk = second;
                    }
                    data=data.toString().substring(0,last);
                }
            }
            else{
                pendingChunk = pendingChunk+data.toString();
            }
			if(findEOL) {
                //There should not be any incomplete message reached here
            var ndcMsg = data.toString().split('\n');

            for(var i=0;i<ndcMsg.length-1;i++) {
                var clientMsg = ndcMsg[i];
                if(!clientMsg)
                    continue
                else {
                    healthCheckReply = true;                    //If any message is coming from NDC , it means current server is alive
                    healthCheckReplyCount = 0;
                }
                util.logger.info(agentConfReader.currentTestRun + " | Control message received from ndc:" + ndcMsg[i]);
                if (ndcMsg[i].trim().length === 0) {
                    //util.logger.warn(Server.TestRunIDValue,"","","Invalid line found, so ignoring.");
                    continue;
                }
                if(clientMsg.trim().startsWith('nd_ctrl_msg_rep:result=Ok;status=NOT_RUNNING') || clientMsg.trim().startsWith('nd_ctrl_msg_rep:result=Ok;status=RUNNING')){
                    if(clientMsg.trim().startsWith('nd_ctrl_msg_rep:result=Ok;status=NOT_RUNNING')) {
                        stopAllMonitors()
                        closeDataAutoConnections();
                    }
                    var parseData = clientMsg.split(';')
                    var state=-1
                    for(var j in parseData){
                        var temp = parseData[j].split('=')[1]
                        if(parseData[j].indexOf('state') > -1) {
                            state = serverConfig.currentActiveServer.state = temp.trim()
                            util.logger.info(agentConfReader.currentTestRun,'|State for Current server is ',temp)
                            if(serverConfig.currentActiveServer.state == 0){                //If current NDC is temporary then marking it as backup and switching to backup NDC
                                serverConfig.getNextBackupServer();
                                /*if(connectWithoutWait < serverConfig.serverList.length -1){
                                 ++connectWithoutWait;
                                 serverConfig.currentActiveServer.connectWithoutWait = true;
                                 }*/

                                serverConfig.isSwitchOver=1
                                clientSocket.destroy();
                                clientSocket.end();
                                //return;
                            }
                        }
                        else if(parseData[j].indexOf('retryPolicy') > -1){
                            var policy = temp.split('%')
                            serverConfig.retryCount = policy[0]
                            if(policy.length >1)
                                serverConfig.sleepInterval = parseInt(policy[1] * 1000)
                            if(policy.length >2)
                                agentConfReader.healthCheckThreshold = parseInt(policy[2])
                            if(policy.length >3)
                                agentConfReader.healthCheckInterval = parseInt(policy[3] * 1000)

                            util.logger.info(agentConfReader.currentTestRun,'|RetryCount : ',serverConfig.retryCount,',Control Connection SleepInterval',
                                serverConfig.sleepInterval,',HealthCheckThreshold',agentConfReader.healthCheckThreshold,',HealthCheckInterval',agentConfReader.healthCheckInterval)
                        }
                        else if(parseData[j].indexOf('ProtoVersion')){
                        }
                    }
                    if(state == 1){            //If state is coming in CC reply & it is enable, then starting timer to send health check
                        MessageHandler.startHealthCheckTimer(clientSocket);
                    }
                    state=-1
                }
                else if(clientMsg.trim().startsWith("nd_control_rep:action=reconnect;result=Ok")) {             //parsing health check reply
                    healthCheckReply = true;
                    healthCheckReplyCount = 0;
                }
                else if (clientMsg.trim().startsWith("nd_control_req:action=bci_stat;")) {
                    util.logger.info(agentConfReader.currentTestRun,"| Message comes from ndc = " + clientMsg);
                    clientSocket.write("nd_control_rep:result=Success:<Recieved BCI Status At Runtime message successfuly from Client = " + clientSocket.toString() + '\n');

                    if(clientMsg.indexOf("log_agent_info") != -1)
                        agentConfReader.getAgentInfo();
                }
                else if (clientMsg.trim().startsWith("nd_control_req:action=start_instrumentation") ){
                    if (clientMsg.indexOf("cavEpochDiff") === -1)
                        agentConfReader.cavEpochDiffInMills = 1388534400000;

                    if(clientMsg.indexOf("TimeStampDiff") === -1)
                        agentConfReader.diffTimeFromNDC = 0;

                    var dataArray = ndcMsg[i].split(":");
                    var messageArray = dataArray[1].split(";");
                    var action = messageArray[0].split("=");

                    if (action[1] == "start_instrumentation") {
                        stopAllMonitors()
                        closeDataAutoConnections()          //Clearing Old object of data and auto connection
                        resetMonitorCounters()
                        instPrfParseobj.resetInstrListOnStart();        //Clearing instrumentation & File base keyword array
                        try {
                            startInstrProcessing = true;
                            metaData={data:''},expectedFileMetaData={size :0}
                            agentConfReader.isTestRunning = true;
                            agentConfReader.startInstrResponse = false;
                            agentConfReader.invalidFileFormatMsg = true;        //This keyword is used in case invalid file is coming from NDC, so start_instrumentaion reply will be sent
                            agentConfReader.runTimeChange = false;
                            var currTestId = 0;

                            util.logger.info(agentConfReader.currentTestRun + " | isToInstrument : " + agentConfReader.isToInstrument);
                            util.logger.info(agentConfReader.currentTestRun + " | isTestRunning : " + agentConfReader.isTestRunning);

                            for (var i = 0; i < messageArray.length; i++) {
                                var propertyValuePairs = messageArray[i].split("=");

                                if (propertyValuePairs[0] == "testIdx") {
                                    currTestId = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | New Test run starting-----");
                                }
                                else if (propertyValuePairs[0] == "status") {
                                    agentConfReader.status = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | Status value : " +agentConfReader.status);
                                }
								else if (propertyValuePairs[0] == "enableBciDebug") {
                                    agentConfReader.enableBciDebug = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | enableBciDebug value : " +agentConfReader.enableBciDebug);
                                }
                                 else if (propertyValuePairs[0] == "ndMethodMonTraceLevel") {
                                    agentConfReader.ndMethodMonTraceLevel = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | ndMethodMonTraceLevel : "+agentConfReader.ndMethodMonTraceLevel);
                                }
                                else if (propertyValuePairs[0] == "enableBackendMonTrace") {
                                    agentConfReader.enableBackendMonTrace = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | enableBackendMonTrace : "+agentConfReader.enableBackendMonTrace);
                                }
                                else if (propertyValuePairs[0] == "ndCollectorIP") {
                                    agentConfReader.ndcHost = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | ndcHost : "+agentConfReader.ndcHost);
                                }
                                else if (propertyValuePairs[0] == "ndCollectorPort") {
                                    agentConfReader.ndcPort = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | ndcPort : "+agentConfReader.ndcPort);
                                }
                                /*Handling nodeJS specific keywords:
                                * 1- dynamicSlowVslowThreshold =It will set threshold of BT dynamically on basis of last 5 samples response time
                                * 2- excludeMethodOnRespTime = It will exclude all methods whose response time is less the specifeid keyword's value
                                * 3- eventLoopMonitor = To enable eventLoopMonitor (89 record)
                                * 4- gcProfiler =  To enable gcProfiler (88 record)
                                * 5- nodejsCpuProfilingTime = This keyword will provide the cpuProfiling waiting time*/
                                else if (propertyValuePairs[0] == "excludeMethodOnRespTime") {
                                    agentConfReader.excludeMethodOnRespTime = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | excludeMethodOnRespTime : "+agentConfReader.excludeMethodOnRespTime);
                                }
                                else if (propertyValuePairs[0] == "dynamicSlowVslowThreshold") {
                                    agentConfReader.dynamicThreshold = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | dynamicSlowVslowThreshold : "+agentConfReader.dynamicThreshold);
                                }
                                else if (propertyValuePairs[0] == "eventLoopMonitor") {
                                    agentConfReader.enable_eventLoop_monitor = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | eventLoopMonitor : "+agentConfReader.enable_eventLoop_monitor);
                                }
                                else if (propertyValuePairs[0] == "gcProfiler") {
                                    agentConfReader.enable_garbage_profiler = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | gcProfiler : "+agentConfReader.enable_garbage_profiler);
                                }
                                else if (propertyValuePairs[0] == "enableForcedFPChain") {
                                    agentConfReader.enableForcedFPChain = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | enableForcedFPChain : "+agentConfReader.enableForcedFPChain);
                                }
                                else if (propertyValuePairs[0] == "nodejsCpuProfilingTime") {
                                    if(propertyValuePairs[1] >0 )       //enabling this keyword if it is > 0, because timer for cpu profiling should't be zero
                                        agentConfReader.nodejsCpuProfilingTime = parseInt(propertyValuePairs[1] * 1000);
                                    else{
                                        util.logger.warn(agentConfReader.currentTestRun + " | Ivalid value for nodejsCpuProfilingTime : "+agentConfReader.nodejsCpuProfilingTime)
                                    }
                                    util.logger.info(currTestId + " | nodejsCpuProfilingTime is :" + agentConfReader.nodejsCpuProfilingTime);
                                }
                                else if (propertyValuePairs[0] == "correlationIDHeader") {
                                    agentConfReader.correlationIDHeader = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | correlationIDHeader : "+agentConfReader.correlationIDHeader);
                                }
                                else if (propertyValuePairs[0] == "enableBTMonitorTrace") {
                                    agentConfReader.enableBTMonitorTrace = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | enableBTMonitorTrace : "+agentConfReader.enableBTMonitorTrace);
                                }
                                else if (propertyValuePairs[0] == "appName") {
                                    agentConfReader.instance = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | app name is : " + agentConfReader.instance);
                                }
                                else if (propertyValuePairs[0] == "tierName") {
                                    agentConfReader.tier = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | tierName is : " + agentConfReader.tier);
                                }
                                else if (propertyValuePairs[0] == "appID") {
                                    agentConfReader.appID = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | appID is : " + agentConfReader.appID);
                                }
                                else if (propertyValuePairs[0] == "tierName") {
                                    agentConfReader.tier = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | tierName is : " + agentConfReader.tier);
                                }
                                else if (propertyValuePairs[0] == "ndMonitorInterval") {
                                    agentConfReader.ndMonitorInterval = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | ndMonitorInterval is : " + agentConfReader.ndMonitorInterval);
                                }
                                else if (propertyValuePairs[0] == "captureHttpTraceLevel") {
                                    agentConfReader.captureHttpTraceLevel = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | captureHttpTraceLevel is : " + agentConfReader.captureHttpTraceLevel);
                                }
                                else if (propertyValuePairs[0] == "ndAppServerHost") {
                                    agentConfReader.server = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | Server name is :" + agentConfReader.server);
                                }
                                else if (propertyValuePairs[0] == "ndAppServerID") {
                                    agentConfReader.serverID = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | Server id is :" + agentConfReader.serverID);
                                }
                                else if (propertyValuePairs[0] == "appID") {
                                    agentConfReader.appID = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | appID is : " + agentConfReader.instance);
                                }
                                else if (propertyValuePairs[0] == "tierID") {
                                    agentConfReader.tierID = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | tierID is : " + agentConfReader.tier);
                                } else if (propertyValuePairs[0] == "ndVectorSeparator") {
                                    agentConfReader.ndVectorSeparator = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | ndVectorSeparator is : " + agentConfReader.ndVectorSeparator);
                                }
                                else if (propertyValuePairs[0] == "cavEpochDiff") {
                                    agentConfReader.cavEpochDiff = propertyValuePairs[1];
                                    agentConfReader.cavEpochDiffInMills = parseInt(propertyValuePairs[1] * 1000);
                                    util.logger.info(currTestId + " | cavEpochDiff is  : " + agentConfReader.cavEpochDiff);
                                }
                                else if (propertyValuePairs[0] == "TimeStampDiff") {
                                    agentConfReader.diffTimeFromNDC = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | diffTimeFromNDC is  : " + agentConfReader.diffTimeFromNDC);
                                }
                                else if (propertyValuePairs[0] == "bciInstrSessionPct") {
                                    agentConfReader.bciInstrSessionPct = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | bciInstrSessionPct is  : " + agentConfReader.bciInstrSessionPct);
                                }
                                else if (propertyValuePairs[0] == "maxCharInSeqBlob") {
                                    agentConfReader.maxCharInSeqBlob = parseInt(propertyValuePairs[1] / 25);
                                    util.logger.info(currTestId + " | maxCharInSeqBlob is  : " + agentConfReader.maxCharInSeqBlob);
                                }
				                else if (propertyValuePairs[0] == "bciMaxNonServiceMethodsPerFP") {
                                    agentConfReader.bciMaxNonServiceMethodsPerFP = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | bciMaxNonServiceMethodsPerFP is  : " + agentConfReader.bciMaxNonServiceMethodsPerFP);
                                }
                                else if (propertyValuePairs[0] == "captureHTTPReqFullFp") {
                                    agentConfReader.httpReqCapturingSettings = NDHttpCaptureSettings.setHttpReqRespCaptureSettings(propertyValuePairs[1],'HTTPCaptureReqFullFP',true)
                                    util.logger.info(currTestId + " | HttpRequestCapturingSettings are  : " , agentConfReader.httpReqCapturingSettings);
                                }
                                else if (propertyValuePairs[0] == "captureHTTPRespFullFp") {
                                    agentConfReader.httpResCapturingSettings = NDHttpCaptureSettings.setHttpReqRespCaptureSettings(propertyValuePairs[1],'HTTPCaptureResFullFP',false)
                                    util.logger.info(currTestId + " | HttpResponseCapturingSettings is  : " ,agentConfReader.httpResCapturingSettings);
                                }
                                else if (propertyValuePairs[0] == "bciDataBufferMaxCount") {
                                    agentConfReader.bciDataBufferMaxCount = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | bciDataBufferMaxCount is  : " ,agentConfReader.bciDataBufferMaxCount);
                                }
                                else if (propertyValuePairs[0] == "bciDataBufferMaxSize") {
                                    agentConfReader.bciDataBufferMaxSize = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | bciDataBufferMaxSize is  : " ,agentConfReader.bciDataBufferMaxSize);
                                }
                                else if (propertyValuePairs[0] == "ASDataBufferSize") {
                                    agentConfReader.ASDataBufferSize = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | ASDataBufferSize is  : " ,agentConfReader.ASDataBufferSize);
                                }
                                else if (propertyValuePairs[0] == "ASDataBufferMaxCount") {
                                    agentConfReader.ASDataBufferMaxCount = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | ASDataBufferMaxCount is  : " ,agentConfReader.ASDataBufferMaxCount);
                                }
                                else if (propertyValuePairs[0] == "maxBTCount") {
                                    agentConfReader.maxBTCount = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | maxBTCount is  : " ,agentConfReader.maxBTCount);
                                }
                                else if (propertyValuePairs[0] == "enableBTMonitor") {
                                    agentConfReader.enableBTMonitor = propertyValuePairs[1] ;
                                    util.logger.info(currTestId + " | enableBTMonitor is  : " + agentConfReader.enableBTMonitor);
					            }
                                else if (propertyValuePairs[0] == "BCILoggingMode") {
                                    agentConfReader.BCILoggingMode = propertyValuePairs[1] ;
                                    util.logger.info(currTestId + " | BCILoggingMode is  : " + agentConfReader.BCILoggingMode);
					            }
                                else if (propertyValuePairs[0] == "startInstrResTimeout") {
                                    agentConfReader.startInstrResTimeout = propertyValuePairs[1] ;
                                    util.logger.info(currTestId + " | startInstrResTimeout is  : " + agentConfReader.startInstrResTimeout);
					            }
				                else if (propertyValuePairs[0] == "enableNDSession") {
                                    agentConfReader.enableNDSession.parseNDSessionKeywords(propertyValuePairs[1]) ;
                                    util.logger.info(currTestId + " | enableNDSession is  : " , agentConfReader.enableNDSession);
			                    }
				                else if (propertyValuePairs[0] == "nodeServerMonitor") {
                                    agentConfReader.nodeServerMonitor = parseInt(propertyValuePairs[1]) ;
                                    util.logger.info(currTestId + " | nodeServerMonitor is  : " + agentConfReader.nodeServerMonitor);
					            }
                                else if (propertyValuePairs[0] == "NVCookie" && !('' === propertyValuePairs[1])) {
                                    agentConfReader.enableNDSession.NVCookie = propertyValuePairs[1] ;
                                    util.logger.info(currTestId + " | NVCookie is  : " + agentConfReader.enableNDSession.NVCookie);
			                    }
                                else if (propertyValuePairs[0] == "enableBackendMonitor") {
                                    if(propertyValuePairs[1] > 0) {
                                        agentConfReader.isBackendMonitorEnabled = true;
                                        util.logger.info(currTestId + " | enableBackendMonitor is  : " + agentConfReader.isBackendMonitorEnabled);
                                    }
                                    else {
                                        agentConfReader.isBackendMonitorEnabled = false;
                                    }
                                }
                                else if (propertyValuePairs[0] == "ndFlowpathMasks") {
                                    var FP_Instances = propertyValuePairs[1].split("%20");

                                    if(FP_Instances[0].indexOf('0x') !== -1)
                                        FP_Instances[0]=FP_Instances[0].split('0x')[1]

                                    agentConfReader.flowPathInstanceInitialID = (big_integer(FP_Instances[0],16)).toString();
                                    agentConfReader.timeStampMask = parseInt((FP_Instances[1]), 16);
                                    agentConfReader.seqNoDigits = parseInt((FP_Instances[2]), 16);
                                    agentConfReader.seqNumMask = parseInt((FP_Instances[3]), 16);
                                }
								else if (propertyValuePairs[0] == "nodeAsyncEventMonitor") {
                                    if(propertyValuePairs[1] > 0) {
                                        agentConfReader.isAsyncEventMonitorEnable = true;
                                        util.logger.info(currTestId + " | nodeAsyncEventMonitor is  : " + agentConfReader.isAsyncEventMonitorEnable);
                                    }
                                    else {
                                        agentConfReader.isAsyncEventMonitorEnable = false;
                                    }
                                }
                                else {
                                 agentConfReader[propertyValuePairs[0]] = propertyValuePairs[1]
                                }
                            }
                            util.initializeLogger(agentConfReader.logLevel,agentConfReader.BCILoggingMode,agentConfReader.instance,true)
                            agentConfReader.cavEpochDiffInMills = agentConfReader.cavEpochDiffInMills - agentConfReader.diffTimeFromNDC ;
                            util.logger.info(currTestId," | cavEpochDiffInMills : ",agentConfReader.cavEpochDiffInMills);
                            agentConfReader.vectorPrefix = agentConfReader.tier + agentConfReader.ndVectorSeparator + agentConfReader.server + agentConfReader.ndVectorSeparator + agentConfReader.instance + agentConfReader.ndVectorSeparator;
                            agentConfReader.vectorPrefixForNodeMonitors = agentConfReader.tier + agentConfReader.ndVectorSeparator + agentConfReader.server + agentConfReader.ndVectorSeparator + agentConfReader.instance ;
                            agentConfReader.vectorPrefixID = agentConfReader.tierID + "|" + agentConfReader.appID + "|";
                            /*
                             if Test run is changed then reseting all the maps and generating FP_Mask again
                             */
                            if (agentConfReader.previousTestRun !== currTestId) {
                                util.logger.info(currTestId + " | Cleaning all maps");

                                flowpathHandler.clearCounter();
                                agentConfReader.backendRecordMap = new Object();
                                agentConfReader.backendMetaMap = new Object();
                                agentConfReader.flowMap = new Object();
                                agentConfReader.backendID = 0;

                                ndAsyncMonitor.clearMap();

                            }
                            //Checking is continous running test or not
                            agentConfReader.continousRunningTest = agentConfReader.previousTestRun === currTestId ? true : false;
                            //setting Test Run id comming from ndc as a current test run id
                            agentConfReader.currentTestRun = currTestId;
                            instPrfParseobj.processInstrFileList(messageArray, clientSocket,makeDataAutoConnection);
                            //fileBasedKeywordGenricFile.parseFileBasedKeywords(messageArray, clientSocket);
                            ndExceptionCaptureSettings.parseExceptionCaptureSettings(clientMsg);
                            calculateDataBufferLength(agentConfReader.bciDataBufferMaxCount,agentConfReader.bciDataBufferMaxSize)
                            calculateDataBufferLength(agentConfReader.ASDataBufferMaxCount,agentConfReader.ASDataBufferSize)
                            otherKeywordHandler.parsingKeywordvalue(messageArray);  //Parse all keyword other than file based keywords
                            util.logger.info(agentConfReader.currentTestRun,'| agentConfReader.settingFileMode is : ',agentConfReader.settingFileMode)
                            if (agentConfReader.settingFileMode.toUpperCase() == "EXCLUSIVE") {
                                var properties = null,list=[];
                                try {
                                    properties = fs.readFileSync(agentConfReader.ndSettingFile).toString()
                                }
                                catch (err) {
                                    util.logger.warn(agentConfReader.currentTestRun + " | Cannot read propery file due to : " + err);
                                }
                                if(properties) {
                                    list = properties.trim().split('\n');
                                    for (var m = 0; m < list.length; m++) {
                                        if (list[m] && list[m].trim().startsWith('tier')) {
                                            list.splice(m, 1);
                                            m = m - 1
                                        }
                                        else if (list[m] && list[m].trim().startsWith('server')) {
                                            list.splice(m, 1);
                                            m = m - 1
                                        }
                                        else if (list[m] && list[m].trim().startsWith('instance')) {
                                            list.splice(m, 1);
                                            m = m - 1
                                        }
                                    }
                                    list.push('tier=' + agentConfReader.tier)
                                    list.push('server=' + agentConfReader.server);
                                    list.push('instance=' + agentConfReader.instance);

                                    list = list.join('\n')
                                    util.logger.info(agentConfReader.currentTestRun, '| Updating ndsettings.conf file : ', list)
                                    fs.writeFile(agentConfReader.ndSettingFile, list, function (err) {
                                        if (err)util.logger.error(err);

                                        var stat = fs.statSync(agentConfReader.ndSettingFile)        //Getting the stat of file .
                                        agentConfReader.lastModifiedSize = stat.size;
                                        agentConfReader.lastModifiedTime = stat.mtime;
                                    });
                                }
                            }
                        }
                        catch (err) {
                            util.logger.warn(err);
                        }
                    }
                }
                else if (clientMsg.trim().startsWith("nd_control_req:action=reconnect")) {
                    if(expectedFileMetaData.size >0)
                        metaData={data:''},expectedFileMetaData={size :0}
                    if(agentConfReader.runTimeChange){
                        agentConfReader.runTimeChange = false;
                        util.logger.info(agentConfReader.currentTestRun + " | Got wrong file ",expectedFileMetaData.keywordName,'So clearing maps')
                    }
                }
                else if (clientMsg.trim().startsWith("nd_control_req:action=stop_instrumentation")) {
                    var dataArray = clientMsg.split(":");
                    var messageArray = dataArray[1].split(";");
                    var action = messageArray[0].split("=");
                    var status = messageArray[1].split("=")[1];

                    util.logger.info(agentConfReader.currentTestRun + " | stop_instrumentation message from ndc ")

                    if (status == "stopping" || status == "running") {
                        metaData={data:''},expectedFileMetaData={size :0}
                        if (agentConfReader.dataConnHandler && agentConfReader.autoSensorConnHandler) {

                            MessageHandler.dumpMethodLastRecord(10, agentConfReader.dataConnHandler);

                            agentConfReader.isToInstrument = false;
                            agentConfReader.isTestRunning = false;
                            agentConfReader.previousTestRun = agentConfReader.currentTestRun;
                            agentConfReader.currentTestRun = 0;
                            agentConfReader.runTimeChange = false;
                            //creating control message
                            controlMessage = "nd_control_rep:action=stop_instrumentation;status=" + status + ";result=Ok;" + "\n";

                            util.logger.info(agentConfReader.currentTestRun + " | Destroying the Data and AutoSensor connection . ")
                            stopAllMonitors()
                            closeDataAutoConnections()
                            instPrfParseobj.resetInstrListOnStart();        //Clearing instrumentation & File base keyword array
                            util.logger.info(agentConfReader.currentTestRun + " | " + controlMessage);
                            clientSocket.write(controlMessage);               //Stopping the connection
                        }
                    }
                }

                else if (clientMsg.trim().startsWith("nd_meta_data_req:action=send_meta_data;")) {
                    ndMetaDataRecoveryProcess.processClientMessage(clientMsg, clientSocket);
                    clientSocket.write("nd_meta_data_rep:status=complete;\n");
                }

                else if (clientMsg.trim().startsWith("nd_meta_data_req:action=get_thread_dump;")) {
                    try {
                        var dataArray = clientMsg.split(":");
                        //This message needs BCIAgent to take threaddump
                        //log the cline message
                        //start the threaddump processor
                        //send the completion response
                        //if error send the response
                        var compressMode = false;
                        if (dataArray[1].indexOf(";CompressMode=1;") != -1)
                            compressMode = true;

                        util.logger.info(agentConfReader.currentTestRun + " | Invoking CPU Profiling request for 10 min .");
                        v8_profiler.startCpuProfiling(clientSocket);
                    }
                    catch (err) {
                        clientSocket.write("nd_meta_data_rep:action=get_thread_dump;result=Error:<Unable to take cpuProfiling , please check NodeAgent logs>;\n");
                        util.logger.warn(agentConfReader.currentTestRun + " | Unable to take cpu_profiling : " + err);
                    }
                }

                else if (clientMsg.trim().startsWith("nd_meta_data_req:action=get_heap_dump;")) {
                    try {
                        util.logger.info(agentConfReader.currentTestRun + " | Invoking for Heap Dump .");
                        MessageHandler.handleClientMessageForTakingHeapDump(clientMsg, clientSocket);
                    }
                    catch (e) {
                        clientSocket.write("nd_meta_data_rep:action=get_heap_dump;result=Error:<Unable to take heapDump Because Of Exception.Check BCI error log for detail.>;\n");
                        util.logger.warn(agentConfReader.currentTestRun + " | Unable to take heapDump : " + e);
                    }
                }

                else if(clientMsg.trim().startsWith("nd_control_req:action=modify;")) {
                   // instrProfileParseSuccess = true;//for every instrument profile starting this will be true, if during any failure occur it will false
                    /*if(!controlCommunicationBusyFlag)
                     sendOutput("nd_control_rep:result=Error:<Unable to process modify message because of no control connection is on established." + '\n');
                     else*/

                    if (!agentConfReader.isTestRunning)
                        clientSocket.write("nd_control_rep:result=Error:<Unable to process modify message because of stop instrument recieved or startInstrument not recieved." + '\n');
                    else
                        MessageHandler.handleRunTimeChangeCase(clientMsg,clientSocket);
                }

                else if(clientMsg.trim().startsWith("nd_control_rep:action=file") || clientMsg.trim().startsWith("nd_control_rep:action=instrumentation_profile")) {
                    metaData={data:''},expectedFileMetaData={size :0}
                    var dataArray = clientMsg.split(":");
                    var messageArray = dataArray[1].split(";");
                    var action = messageArray[0].split("=");
                    if (action[1] == "file") {
                        expectedFileMetaData = fileBasedKeywordGenricFile.readFileContent(messageArray[1], clientSocket);
                    }
                    else if(action[1] == "instrumentation_profile") {
                        expectedFileMetaData = fileBasedKeywordGenricFile.readInstrProfileContent(messageArray)
                    }
                    if( i < ndcMsg.length -2) {         //Checking if nd_control_rep:action=file msg and data coming in same chunk or not, ig it is same then going to read
                        metaData={data:''}
                        if(data.indexOf('nd_control_rep:action=file') > -1) {
                            var con = content.toString()
                            var fileIndex = con.indexOf('action=file');
                            var indexofN = con.indexOf('\n',fileIndex)          //Checking first indexOf \n after nd_control_rep:action=file
                            var msg = con.substring(indexofN +1, con.length)
                            MessageHandler.readFileContent(msg, clientSocket);
                            break;
                        }
                        else if(data.indexOf('nd_control_rep:action=instrumentation_profile') > -1) {
                            var con = content.toString()
                            var fileIndex = con.indexOf('action=instrumentation_profile');
                            var indexofN = con.indexOf('\n',fileIndex)          //Checking first indexOf \n after nd_control_rep:action=file
                            var msg = con.substring(indexofN +1, con.length)
                            MessageHandler.readFileContent(msg, clientSocket);
                            break;
                        }
                    }
                }
                else if(clientMsg.trim().startsWith("nd_control_req:action=reroute_ctrl_con;")){

                    MessageHandler.parseReRouteMessageAndUpdateClientInfo(clientMsg);
                    MessageHandler.updateNDSettingFile();
                    if (agentConfReader.isTestRunning) {
                        metaData = {data: ''}, expectedFileMetaData = {size: 0} ,agentConfReader.runTimeChange=false
                        if (agentConfReader.dataConnHandler && agentConfReader.autoSensorConnHandler) {
                            agentConfReader.isTestRunning = false;
                            agentConfReader.isToInstrument = false;
                            agentConfReader.runTimeChange = false;
                            agentConfReader.previousTestRun = agentConfReader.currentTestRun;
                            agentConfReader.currentTestRun = 0;
                            MessageHandler.dumpMethodLastRecord(10, agentConfReader.dataConnHandler);
                            stopAllMonitors();
                            closeDataAutoConnections();
                            instPrfParseobj.resetInstrListOnStart();        //Clearing instrumentation & File base keyword array
                            clientSocket.write("nd_control_rep:action=stop_instrumentation;status=stopping;result=Ok;" + "\n");

                        }
                    }
                    try{
                        clientSocket.destroy();
                    }catch(ee){
                        util.logger.warn(agentConfReader.currentTestRun + " | Error in re-routing : " + ee);
                    }
                }
                else{
                    //instPrfParseobj.processInstrFile(ndcMsg[i], clientSocket,makeDataAutoConnection);
                }
            }
        }
	}
        catch(err){util.logger.warn(err)}
    })
};

MessageHandler.readFileContent= function(data,clientSocket)  {
    if(!data)return;
    if( pendingChunk != '') {
        //data += pendingChunk +'\n';
        pendingChunk=''
    }
    if(parseInt(data.length) === parseInt(expectedFileMetaData.size))  {
        util.logger.info("Complete Data received : ",data.toString())
        if(expectedFileMetaData.type==="instrumentationProfile")
            instPrfParseobj.processInstrFile(data, clientSocket,makeDataAutoConnection);
        else
            instPrfParseobj.readFileBasedKeywordContent(data,clientSocket,makeDataAutoConnection);

        metaData={data:''},expectedFileMetaData={size :0}
        metaData.size=0;

        if(agentConfReader.runTimeChange) {
            clientSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
            util.logger.info(agentConfReader.currentTestRun + " | nd_control_rep:action=modify;result=Ok;" + '\n');
            agentConfReader.runTimeChange = false;
        }
    }
    else if(metaData.data.length === expectedFileMetaData.size){
        if(expectedFileMetaData.type ==="instrumentationProfile")
            instPrfParseobj.processInstrFile(metaData.data, clientSocket,makeDataAutoConnection);
        else
            instPrfParseobj.readFileBasedKeywordContent(metaData.data, clientSocket,makeDataAutoConnection);
        metaData={data:''},expectedFileMetaData={size :0}
        if(agentConfReader.runTimeChange) {
            clientSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
            util.logger.info(agentConfReader.currentTestRun + " | nd_control_rep:action=modify;result=Ok;" + '\n');
            agentConfReader.runTimeChange = false;
        }
    }
    else if(parseInt(data.length )< parseInt(expectedFileMetaData.size)) {
         metaData.data +=data ;
         if(parseInt(metaData.data.length) === parseInt(expectedFileMetaData.size)){
            if(expectedFileMetaData.type ==="instrumentationProfile")
                instPrfParseobj.processInstrFile(metaData.data, clientSocket,makeDataAutoConnection);
            else
                instPrfParseobj.readFileBasedKeywordContent(metaData.data, clientSocket,makeDataAutoConnection);
                metaData={data:''},expectedFileMetaData={size :0}
            if(agentConfReader.runTimeChange) {
                clientSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
                util.logger.info(agentConfReader.currentTestRun + " | nd_control_rep:action=modify;result=Ok;" + '\n');
                agentConfReader.runTimeChange = false;
            }
         }
         else if(parseInt(metaData.data.length) > parseInt(expectedFileMetaData.size)) {
             metaData.data = metaData.data.substring(0,parseInt(expectedFileMetaData.size))
             if(parseInt(metaData.data.length) === parseInt(expectedFileMetaData.size)){
                 if(expectedFileMetaData.type ==="instrumentationProfile")
                     instPrfParseobj.processInstrFile(metaData.data, clientSocket,makeDataAutoConnection);
                 else
                     instPrfParseobj.readFileBasedKeywordContent(metaData.data, clientSocket,makeDataAutoConnection);
                 metaData={data:''},expectedFileMetaData={size :0}
                 if(agentConfReader.runTimeChange) {
                     clientSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
                     util.logger.info(agentConfReader.currentTestRun + " | nd_control_rep:action=modify;result=Ok;" + '\n');
                     agentConfReader.runTimeChange = false;
                 }

             }
         }
    }
    else if(parseInt(data.length) > parseInt(expectedFileMetaData.size)) {
	    metaData.data +=data ;
        metaData.data = metaData.data.substring(0,parseInt(expectedFileMetaData.size))
        if(parseInt(metaData.data.length) === parseInt(expectedFileMetaData.size)){
            if(expectedFileMetaData.type ==="instrumentationProfile")
                instPrfParseobj.processInstrFile(metaData.data, clientSocket,makeDataAutoConnection);
            else
                instPrfParseobj.readFileBasedKeywordContent(metaData.data, clientSocket,makeDataAutoConnection);
            metaData={data:''},expectedFileMetaData={size :0}
            if(agentConfReader.runTimeChange) {
                clientSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
                util.logger.info(agentConfReader.currentTestRun + " | nd_control_rep:action=modify;result=Ok;" + '\n');
                agentConfReader.runTimeChange = false;
            }
        }
    }
}

MessageHandler.parseAllFieldsAndSetInModelIfAllSuccess = function (clientMsg,controlSocket){
    if(clientMsg.indexOf(";") !== -1) {
        var allArguments = clientMsg.trim().split(";");
        for (var i in allArguments) {
            if(!allArguments[i])
                continue
            var argumentAndValue = allArguments[i].split("=");
            var strKeyword = argumentAndValue[0].toString().trim();
            var strKeywordValue = argumentAndValue[1].toString().trim();

            if (argumentAndValue == null || argumentAndValue.length != 2) {
                util.logger.info(agentConfReader.currentTestRun, " | Ignoring Argument as it is not in proper foramt. Argument = ", allArguments[i]);
                continue;
            }
            else if(otherKeywordHandler.parsingKeywordvalue(allArguments[i]))
                continue ;
            else if (allArguments[i].startsWith("bciInstrSessionPct")) {
                agentConfReader.bciInstrSessionPct = strKeywordValue;
                util.logger.info(agentConfReader.currentTestRun + " | bciInstrSessionPct : "+agentConfReader.bciInstrSessionPct);
            }
            else if (allArguments[i].startsWith("BCILoggingMode")) {
                agentConfReader.BCILoggingMode = strKeywordValue;
                util.logger.info(agentConfReader.currentTestRun + " | BCILoggingMode : "+agentConfReader.BCILoggingMode);
                util.initializeLogger(agentConfReader.logLevel,agentConfReader.BCILoggingMode,agentConfReader.instance,true)
            }
            else if (allArguments[i].startsWith("maxCharInSeqBlob")) {
                agentConfReader.maxCharInSeqBlob = parseInt(strKeywordValue / 25);
                util.logger.info(agentConfReader.currentTestRun + " | Applying run time change for maxCharInSeqBlob is  : " + agentConfReader.maxCharInSeqBlob);
            }
            else if (allArguments[i].startsWith("bciDataBufferMaxCount")) {
                agentConfReader.bciDataBufferMaxCount = strKeywordValue;
                calculateDataBufferLength(agentConfReader.bciDataBufferMaxCount,agentConfReader.bciDataBufferMaxSize)
                util.logger.info(agentConfReader.currentTestRun + " | Applying run time change for bciDataBufferMaxCount is  : " ,agentConfReader.bciDataBufferMaxCount);
            }
            else if (allArguments[i].startsWith("bciDataBufferMaxSize")) {
                agentConfReader.bciDataBufferMaxSize = strKeywordValue;
                calculateDataBufferLength(agentConfReader.bciDataBufferMaxCount,agentConfReader.bciDataBufferMaxSize)
                util.logger.info(agentConfReader.currentTestRun + " | Applying run time change for bciDataBufferMaxSize is  : " ,agentConfReader.bciDataBufferMaxSize);
            }
            else if (allArguments[i].startsWith("enableNDSession")) {
                agentConfReader.enableNDSession.parseNDSessionKeywords(strKeywordValue) ;
                util.logger.info(agentConfReader.currentTestRun + " | Applying run time change for  enableNDSession is  : " + agentConfReader.enableNDSession);
            }
            else if (allArguments[i].startsWith("NVCookie") && !('' === strKeywordValue)) {
                agentConfReader.enableNDSession.NVCookie = strKeywordValue ;
                util.logger.info(agentConfReader.currentTestRun + " | Applying run time change for  NVCookie is  : " + agentConfReader.enableNDSession.NVCookie);
            }
            else if (allArguments[i].startsWith("nodeServerMonitor") && !('' === strKeywordValue)) {
                agentConfReader.nodeServerMonitor = parseInt(strKeywordValue) ;
                util.logger.info(agentConfReader.currentTestRun + " | Applying run time change for nodeServerMonitor is  : " + agentConfReader.nodeServerMonitor);
                serverMonitor.handleServerMonitor()
            }
            else if (allArguments[i].startsWith("ASDataBufferSize")) {
                agentConfReader.ASDataBufferSize = strKeywordValue;
                calculateASLength(agentConfReader.ASDataBufferSize,agentConfReader.ASDataBufferMaxCount)
                util.logger.info(agentConfReader.currentTestRun + " | Applying run time change for ASDataBufferSize is  : " ,agentConfReader.ASDataBufferSize);
            }
            else if (allArguments[i].startsWith("ASDataBufferMaxCount")) {
                agentConfReader.ASDataBufferMaxCount = strKeywordValue;
                calculateASLength(agentConfReader.ASDataBufferSize,agentConfReader.ASDataBufferMaxCount)
                util.logger.info(agentConfReader.currentTestRun + " | Applying run time change for ASDataBufferMaxCount is  : " ,agentConfReader.ASDataBufferMaxCount);
            }
            else if (allArguments[i].startsWith("correlationIDHeader")) {
                agentConfReader.correlationIDHeader = strKeywordValue
                util.logger.info(agentConfReader.currentTestRun + " | Applying run time change for correlationIDHeader is  : " + agentConfReader.correlationIDHeader);
            }
            else if (allArguments[i].startsWith("enableForcedFPChain")) {
                agentConfReader.enableForcedFPChain = strKeywordValue;
                util.logger.info(agentConfReader.currentTestRun + " | Applying run time change for enableForcedFPChain is  : " + agentConfReader.enableForcedFPChain);
            }
            else if (allArguments[i].startsWith("bciMaxNonServiceMethodsPerFP")) {
                agentConfReader.bciMaxNonServiceMethodsPerFP = strKeywordValue;
                util.logger.info(agentConfReader.currentTestRun + " | Applying run time change for bciMaxNonServiceMethodsPerFP is  : " + agentConfReader.bciMaxNonServiceMethodsPerFP);
            }
            else if (allArguments[i].startsWith("nodejsCpuProfilingTime")) {
                if(strKeywordValue >0 )
                    agentConfReader.nodejsCpuProfilingTime = parseInt(strKeywordValue * 1000);
                else{
                    util.logger.warn(agentConfReader.currentTestRun + " | Ivalid value for nodejsCpuProfilingTime : "+agentConfReader.nodejsCpuProfilingTime)
                }
                util.logger.info(agentConfReader.currentTestRun + " | nodejsCpuProfilingTime : "+agentConfReader.nodejsCpuProfilingTime);
            }
            else if (allArguments[i].startsWith("excludeMethodOnRespTime")) {
                agentConfReader.excludeMethodOnRespTime = strKeywordValue
                util.logger.info(agentConfReader.currentTestRun ,"| excludeMethodOnRespTime : "+agentConfReader.excludeMethodOnRespTime);
            }
            else if (allArguments[i].startsWith("dynamicSlowVslowThreshold")) {
                agentConfReader.dynamicThreshold = strKeywordValue
                util.logger.info(agentConfReader.currentTestRun + " | dynamicSlowVslowThreshold : "+agentConfReader.dynamicThreshold);
            }
            else if (allArguments[i].startsWith("eventLoopMonitor")) {
                agentConfReader.enable_eventLoop_monitor = strKeywordValue
                util.logger.info(agentConfReader.currentTestRun + " | eventLoopMonitor : "+agentConfReader.enable_eventLoop_monitor);
                eventLoopMonitor.handleEventLoopMonitor();
            }
            else if (allArguments[i].startsWith("gcProfiler")) {
                agentConfReader.enable_garbage_profiler = strKeywordValue
                util.logger.info(agentConfReader.currentTestRun + " | gcProfiler : "+agentConfReader.enable_garbage_profiler);
                heapGcMonitor.handleHeapGcMonitor();
            }
            else if (allArguments[i].startsWith("enableBTMonitorTrace")) {
                agentConfReader.enableBTMonitorTrace = strKeywordValue
                util.logger.info(agentConfReader.currentTestRun + " | enableBTMonitorTrace : "+agentConfReader.enableBTMonitorTrace);
            }
            else if (allArguments[i].startsWith("enableBackendMonTrace")) {
                agentConfReader.enableBackendMonTrace = strKeywordValue
                util.logger.info(agentConfReader.currentTestRun + " | enableBackendMonTrace : "+agentConfReader.enableBackendMonTrace);
            }
            else if (allArguments[i].startsWith("ndMethodMonTraceLevel")) {
                agentConfReader.ndMethodMonTraceLevel = strKeywordValue
                util.logger.info(agentConfReader.currentTestRun + " | ndMethodMonTraceLevel : "+agentConfReader.ndMethodMonTraceLevel);
            }
            else if (allArguments[i].startsWith("captureHttpTraceLevel")) {
                agentConfReader.captureHttpTraceLevel = strKeywordValue
                util.logger.info(agentConfReader.currentTestRun + " | captureHttpTraceLevel : "+agentConfReader.captureHttpTraceLevel);
            }
            else if (allArguments[i].startsWith("ndMonitorInterval")) {
                agentConfReader.ndMonitorInterval = strKeywordValue;
                util.logger.info(agentConfReader.currentTestRun + " | ndMonitorInterval is : " + agentConfReader.ndMonitorInterval);
            }
            else if (allArguments[i].startsWith("enableBciDebug")) {
                agentConfReader.enableBciDebug = strKeywordValue
                util.logger.info(agentConfReader.currentTestRun + " | enableBciDebug value : " +agentConfReader.enableBciDebug);
            }
            else if (allArguments[i].startsWith("startInstrResTimeout")) {
                agentConfReader.startInstrResTimeout = strKeywordValue
                util.logger.info(agentConfReader.currentTestRun + " | startInstrResTimeout value : " +agentConfReader.startInstrResTimeout);
            }
            else if (allArguments[i].startsWith("captureHTTPReqFullFp")) {
                agentConfReader.httpReqCapturingSettings = NDHttpCaptureSettings.setHttpReqRespCaptureSettings(strKeywordValue,'HTTPCaptureReqFullFP',true)
                util.logger.info(agentConfReader.currentTestRun + " | HttpRequestCapturingSettings are  : " , agentConfReader.httpReqCapturingSettings);
            }
            else if (allArguments[i].startsWith("captureHTTPRespFullFp")) {
                agentConfReader.httpResCapturingSettings = NDHttpCaptureSettings.setHttpReqRespCaptureSettings(strKeywordValue,'HTTPCaptureResFullFP',false)
                util.logger.info(agentConfReader.currentTestRun + " | HttpResponseCapturingSettings is  : " ,agentConfReader.httpResCapturingSettings);
            }
            else if (allArguments[i].startsWith("ASSampleInterval=")) {
                if (strKeywordValue > 0) {
                    asMangerObj.startMonitor();
                    util.logger.info(agentConfReader.currentTestRun + " | enableAutosensordMonitor is Enabled ");
                }
                else {
                    asMangerObj.stopMonitor();
                }
            }
            else if (allArguments[i].startsWith("enableBTMonitor")) {
                    agentConfReader.enableBTMonitor = strKeywordValue;
                    ndBTMonitor.handleBtMonitor();
                    util.logger.info(agentConfReader.currentTestRun + " | enableBTMonitor is  : " + agentConfReader.enableBTMonitor);
            }
            else if (allArguments[i].startsWith("enableBackendMonitor=")) {
                if (strKeywordValue > 0) {
                    agentConfReader.isBackendMonitorEnabled = true;
                    ndBackendMonitor.handleBackendMonitor();
                    util.logger.info(agentConfReader.currentTestRun + " | enableBackendMonitor is  : " + agentConfReader.isBackendMonitorEnabled);
                }
                else {
                    agentConfReader.isBackendMonitorEnabled = false;
                    ndBackendMonitor.handleBackendMonitor();
                }
            }
            else if (allArguments[i].startsWith("enableFPTrace=")) {}
            else if (allArguments[i].startsWith("nodeAsyncEventMonitor=")) {
                if (strKeywordValue > 0) {
                    if(!agentConfReader.isAsyncEventMonitorEnable){
                    agentConfReader.isAsyncEventMonitorEnable = true;
                    ndAsyncMonitor.handleAsyncEventMonitor();
                    util.logger.info(agentConfReader.currentTestRun + " | nodeAsyncEventMonitor is  : " + agentConfReader.isAsyncEventMonitorEnable);
                    }
                }
                else {
					if(agentConfReader.isAsyncEventMonitorEnable){
                    agentConfReader.isAsyncEventMonitorEnable = false;
                    ndAsyncMonitor.handleAsyncEventMonitor();
					}
                }
            }
        }
    }
    controlSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
}

MessageHandler.handleRunTimeChangeCase = function(clientMsg,controlSocket) {
    try {
        if (clientMsg.indexOf("size=0;lmd=") != -1) {
            controlSocket.write("nd_control_rep:action=instrumentation_profile;result=Error:<Could not recieve modify message because of instrument profile having size 0.Check Instrument profile and retry again.>" + '\n');

            util.logger.info(agentConfReader.currentTestRun + " | nd_control_rep:action=instrumentation_profile;result=Error:<Could not recieve modify message because of instrument profile having size 0.Check Instrument profile and retry again.>" + '\n');
            return;//No need to process more forwards
        }

        if (clientMsg.indexOf("ndMethodMonFile=NA;") != -1) {
            ndMethodMonitor.clearMmMap();
            ndMethodMonitor.clearMMList();
            instPrfParseobj.removeFilebasedKeyword('ndMethodMonFile');
            controlSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
            return;
        }
        if (clientMsg.indexOf("BTTConfig=NA;") != -1) {
            instPrfParseobj.removeFilebasedKeyword('BTTConfig')
            controlSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
            return;
        }
        if (clientMsg.indexOf("BTRuleConfig=NA;") != -1) {

            btManager.clear();
            btGlobalRule.clearGlobalObj();
            btConfig.isPatternBasedRulePresnt = false;
            btRuleList.clearList();
            btConfig.resetBtId();
            instPrfParseobj.removeFilebasedKeyword('BTRuleConfig');
            controlSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
            return;
        }
        if (clientMsg.indexOf("ndBackendNamingRulesFile=NA;") != -1) {
            backendRecord.clearBackendRuleList()
            instPrfParseobj.removeFilebasedKeyword('ndBackendNamingRulesFile')
            controlSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
            return;
        }
        if (clientMsg.indexOf("HTTPStatsCondCfg=NA") != -1) {
            NDHttpConditionStats.resetValues();
            instPrfParseobj.removeFilebasedKeyword('HTTPStatsCondCfg')
            controlSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
            return;
        }
        if (clientMsg.indexOf("captureCustomData=NA") != -1) {
            NDSessionCaptureSettings.resetValues();
            instPrfParseobj.removeFilebasedKeyword('captureCustomData')
            controlSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
            return;
        }
        else if ((clientMsg.indexOf("HTTPStatsCondCfg") != -1) || (clientMsg.indexOf("NDHTTPRe") != -1)
            || (clientMsg.indexOf("ndMethodMonFile") != -1) || (clientMsg.indexOf("ndExceptionMonFile") != -1)
            || (clientMsg.indexOf("NDAppLogFile") != -1) || (clientMsg.indexOf("ndBackendMonFile") != -1)
            || (clientMsg.indexOf("cavNVURLFile") != -1) || (clientMsg.indexOf("NDInterfaceFile") != -1)
            || (clientMsg.indexOf("NDEntryPointsFile") != -1) || (clientMsg.indexOf("BTTConfig") != -1)
            || (clientMsg.indexOf("BTRuleConfig") != -1) || (clientMsg.indexOf("BTErrorRules") != -1)
            || (clientMsg.indexOf("ndBackendNamingRulesFile") != -1) || (clientMsg.indexOf("generateExceptionConfFile") != -1)
            || (clientMsg.indexOf("captureCustomData") != -1)|| (clientMsg.indexOf("instrProfile") != -1)) {

            var messageArray = clientMsg.split(';');
            agentConfReader.runTimeChange = true
            instPrfParseobj.processInstrFileList(messageArray, controlSocket,makeDataAutoConnection,true);
            return;
        }
        MessageHandler.parseAllFieldsAndSetInModelIfAllSuccess(clientMsg,controlSocket);

    }
    catch(e)
    {
        util.logger.warn(e);
    }
}

MessageHandler.dumpMethodLastRecord = function(num,dataSocket){
    var tenRecord = num + "," + '\n';
    try
    {
        util.logger.info(agentConfReader.currentTestRun+ " | DumpMethodLastRecord "+tenRecord);
        dataSocket.write(tenRecord);
    }
    catch(e)
    {
        util.logger.warn(e);
    }
}

MessageHandler.handleClientMessageForTakingHeapDump = function(clientMsg,clientSocket) {
        var respMessage = "";
       /* if (agentConfReader.isHeapDumpInProgress) {
            try { //log a message and return from here
                //send error message to ndc and return
                respMessage = "nd_meta_data_rep:action=get_heap_dump;result=Error:<Unable to take heapDump Because Of BCI is already busy for previous request. previous request time :" + lastHeapdumpReqTime + ".>;\n";
                clientSocket.write(respMessage);

                return;
            } catch (err) {
                util.logger.warn(agentConfReader.currentTestRun + " | nd_meta_data_rep:action=get_heap_dump;result=Error:<Unable to take heapDump Because Of BCI is already busy for previous request. previous request time :" + lastHeapdumpReqTime + ".>;\n" + err)
            }

        }*/
        //Save the requested time for next time logging in case
        lastHeapdumpReqTime = new Date().toString();
        agentConfReader.isHeapDumpInProgress = true;
        v8_profiler.takeHeapSnapShot(clientSocket);
};

MessageHandler.findParametersAndValidate = function(clientMsg,clientSocket){
    var allFields = clientMsg.split(";");
    var respMessage = "";
    var fileName;
    var fileParentDir;
    var pathFromNDC;
    var file_path;
    var isOnlyLive = true;
    var heapDirExists =false;
    try {
        for (var i in allFields) {

            //Collect file path and validate if parent dir is present or not ??
            if (-1 != allFields[i].indexOf("File=")) {

                file_path = allFields[i].split("=")[1].toString();
                if (-1 != file_path.indexOf('.'))
                    file_path = file_path.split('.')[0] + '.heapsnapshot';
                else
                    file_path = file_path + '.heapsnapshot';

                util.logger.info(agentConfReader.currentTestRun+" | File path for Heap Dump is : "+file_path);
                if(file_path.startsWith('/')) {
                    fileParentDir = file_path.substring(0, file_path.lastIndexOf(path.sep));
                    fileName = file_path.substring(file_path.lastIndexOf(path.sep) + 1, file_path.length);
                }
                else{
                    if(file_path.indexOf('/') != -1) {
                        fileParentDir = '/opt/cavisson/netdiagnostics/logs/heapdump/'+file_path.substring(0, file_path.lastIndexOf(path.sep));
                        fileName = file_path.substring(file_path.lastIndexOf(path.sep) + 1, file_path.length);
                        file_path = fileParentDir + '/' + fileName
                    }
                    else {
                        fileParentDir = '/opt/cavisson/netdiagnostics/logs/heapdump';
                        file_path = fileParentDir + '/' + file_path
                    }
                }
                if (fs.existsSync(fileParentDir)) {
                    heapDirExists = true;
                }
                else{
                    try {
                        execSync('mkdir -p '+fileParentDir)
                        heapDirExists = true;
                    }
                    catch(e){
                    }
                }
            }
            else if (-1 != allFields.indexOf("live")) {
                if (val == "1")
                    isOnlyLive = true;
                else
                    isOnlyLive = false;
            }
        }
    }catch(err){util.logger.warn(agentConfReader.currentTestRun+" | Invalid path for Heap dump file ."+err)}


    try {
        if (!fs.existsSync(file_path)) {
            if (heapDirExists ) {
                isHeapDumpInProgress = true;
                v8_profiler.takeHeapSnapShot(file_path, clientSocket);
                isHeapDumpInProgress = false;
            }
            else{
                clientSocket.write("nd_meta_data_rep:action=get_heap_dump;result=Error:<Unable to take heapDump Because heap directory not exist>;\n");
                util.logger.warn(agentConfReader.currentTestRun+" |  Unable to take heapDump Because heap directory not exist")
            }
        }
        else{
            respMessage = "nd_meta_data_rep:action=get_heap_dump;result=Error:<Unable to take heapDump Because file path specified by user, already exists. File name : " + file_path + ".>;\n";
            clientSocket.write(respMessage);
            util.logger.warn(agentConfReader.currentTestRun+" | ",respMessage);
            return ;
        }
    }
    catch (e) {
        clientSocket.write("nd_meta_data_rep:action=get_heap_dump;result=Error:<Unable to take heapDump, please check in agent logs>;\n");
        util.logger.warn(agentConfReader.currentTestRun+" |  Unable to take heapDump " + e);
    }

    return true;
};

MessageHandler.startHealthCheckTimer = function(clientSocket) {
  if(agentConfReader.healthCheckInterval >0) {
    if(agentConfReader.reconnectTimer == undefined) {           //If timer is defined then no need to run new timer
        agentConfReader.reconnectTimer = setInterval(function () {
            if(agentConfReader.runTimeChange || startInstrProcessing || agentConfReader.isHeapDumpInProgress)           // If agent is busy with NDC, then dont send health check msg
                return;

            if (healthCheckReply == false)++healthCheckReplyCount;

            healthCheckReply = false;
            if (healthCheckReplyCount >= agentConfReader.healthCheckThreshold) {           //After failing for some particular time, agent will switch over and close connection
                healthCheckReplyCount=-1;
                serverConfig.currentActiveServer.type = Backup
                util.logger.error(agentConfReader.currentTestRun,"| NDC is not responding over HeartBeat ,Closing connection with" +
                serverConfig.currentActiveServer.ndcHost+':'+serverConfig.currentActiveServer.ndcPort)
                //serverConfig.getNextBackupServer();

                //serverConfig.isSwitchOver=1
                clientSocket.destroy();
                clientSocket.end();
                return;
            }
            if(recoonectCount == Number.MAX_VALUE)
                recoonectCount=0;
            var msg = "nd_control_req:action=reconnect;heartBeat " + (++recoonectCount) + ";\n";
            clientSocket.write(msg);
            if(agentConfReader.enableBciDebug > 1)
                util.logger.info(agentConfReader.currentTestRun+" | HeartBeat :",msg)
        }, agentConfReader.healthCheckInterval)
    }
  }
  else{
    clearInterval(agentConfReader.reconnectTimer)          //Clearing reconnect timer interval
    agentConfReader.reconnectTimer = undefined;
  }
}

MessageHandler.parseReRouteMessageAndUpdateClientInfo = function(clientmsg){
    //nd_control_req:action=reroute_ctrl_con;tier=T1;server=S1;instance=I1;ndcHost=192.168.1.66;ndcPort=7772;
    //In the case of tier=All ... , we should not update tier,server,instance properties
    try {
        var allFields = clientmsg.split(";");
        var ndcHost , ndcPort , bkpNdcHost , bkpNdcPort ;
        for (var eachKeyVal in allFields) {
            var currString = allFields[eachKeyVal];
            if (!currString)return false;

            var all = currString.split("=");
            var key = all[0].toString();

            if (all.length <= 1)return false;

            if (key == "ndcHost") {
                ndcHost = all[1];
                if (ndcHost)
                    agentConfReader.ndcHost = ndcHost;
            }
            else if (key == "ndcPort") {
                ndcPort = all[1];
                if (ndcHost && ndcPort ) {
                    agentConfReader.ndcPort = ndcPort;
                    serverConfig.serverList[0].ndcHost = ndcHost;
                    serverConfig.serverList[0].ndcPort = ndcPort;
                }
            }
            else if (key == "backupNdcHostName") {
                bkpNdcHost = all[1];
                agentConfReader.backupNdcHostName = bkpNdcHost;
                if (agentConfReader.backupNdcPort) {
                    serverConfig.serverList[1].ndcHost = bkpNdcHost;
                }
            }
            else if (key == "backupNdcPort") {
                bkpNdcPort = all[1];
                agentConfReader.backupNdcPort = bkpNdcPort;
                if (agentConfReader.backupNdcHostName) {
                    serverConfig.serverList[1].ndcPort = bkpNdcPort;
                }
            }
            else if (key == "instance") {
                var value = all[1].toString();

                if (value.toUpperCase() != "ALL")
                    agentConfReader.instance = value;
            }
            else if (key == "server") {
                var value = all[1].toString();

                if (value.toUpperCase() != "ALL")
                    agentConfReader.server = value;
            }
            else if (key == "tier") {
                var value = all[1].toString();

                if (value.toUpperCase() != "ALL")
                    agentConfReader.tier = value;
            }
        }
    }catch(err){
        util.logger.warn(agentConfReader.currentTestRun + " | Cannot parse value : " + err);
    }
}

MessageHandler.updateNDSettingFile = function(){
    try{
        if (agentConfReader.settingFileMode.toUpperCase() == "EXCLUSIVE") {
            var properties = null,list=[];
            try {
                properties = fs.readFileSync(agentConfReader.ndSettingFile).toString()
            }
            catch (err) {
                util.logger.warn(agentConfReader.currentTestRun + " | Cannot read propery file due to : " + err);
                return ;
            }
            if(!properties)return;

            list = properties.trim().split('\n');
            for(var m =0;m<list.length;m++){
                if(list[m] &&list[m].startsWith('tier')) {
                    list.splice(m,1);
                    m =m-1
                }
                else if(list[m] &&list[m].startsWith('server')) {
                    list.splice(m, 1);
                    m =m-1
                }
                else if(list[m] &&list[m].startsWith('instance')) {
                    list.splice(m, 1);
                    m =m-1
                }
                else if(list[m] &&list[m].startsWith('ndcHost')) {
                    list.splice(m, 1);
                    m =m-1
                }
                else if(list[m] &&list[m].startsWith('ndcPort')) {
                    list.splice(m, 1);
                    m =m-1
                }
                else if(list[m] &&list[m].startsWith('backupNdcHostName')) {
                    list.splice(m, 1);
                    m =m-1
                }
                else if(list[m] &&list[m].startsWith('backupNdcPort')) {
                    list.splice(m, 1);
                    m =m-1
                }
            }
            list.push('tier='+agentConfReader.tier)
            list.push('server='+agentConfReader.server);
            list.push('instance='+agentConfReader.instance);
            if(agentConfReader.ndcHost)
                list.push('ndcHost='+agentConfReader.ndcHost);
            if(agentConfReader.ndcPort)
                list.push('ndcPort='+agentConfReader.ndcPort);
            if(agentConfReader.backupNdcHostName)
                list.push('backupNdcHostName='+agentConfReader.backupNdcHostName);
            if(agentConfReader.backupNdcPort)
                list.push('backupNdcPort='+agentConfReader.backupNdcPort);
            list = list.join('\n')
            util.logger.info(agentConfReader.currentTestRun,'| Updating ndsettings.conf file : ',list)
            fs.writeFileSync(agentConfReader.ndSettingFile, list)
            var stat = fs.statSync(agentConfReader.ndSettingFile)        //Getting the stat of file .
            if(stat) {
                agentConfReader.lastModifiedSize = stat.size;
                agentConfReader.lastModifiedTime = stat.mtime;
            }
        }
    }
    catch (err) {
        util.logger.warn(agentConfReader.currentTestRun + " | Cannot read propery file due to : " + err);
        return ;
    }
}

module.exports = MessageHandler;
