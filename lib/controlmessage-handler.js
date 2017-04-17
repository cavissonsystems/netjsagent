/**
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
var CaptureCustomData = require('./HttpHeader/CaptureCustomData.js');
var v8_profiler = require('./v8-profiler');
var v8 = require('v8-profiler');
var path = require('path');
var util = require('./util');
var fs = require('fs');
var btConfig = require('./BT/btConfig');
var btManager = require('./BT/btManager.js');
var btRuleList = require('./BT/btPatternRule.js')
var asMangerObj = require('./autoSensor/autoSensorManager'); //Requiring ASManager object, this file controls all AS events
var otherKeywordHandler = require('./handleOtherKeywords'); //Requiring OhandleOtherKeywords object ,handling of all keywords other than file based keyword.
var asSettingObj = require('./autoSensor/autoSensorSetting'); //Requiring ASSetting object ,all keywords of AS are assigned in this file
var isHeapDumpInProgress = false;
var lastHeapdumpReqTime = "";
var heapDumpCount = 0;
var instPrfParseobj = require('./instrProfileParser');
var mthMonitorObj ;
var fileBasedKeywordGenricFile = require('./ndFileBasedKeywordHandler');
//var exec = require('child_process').execSync;
var execSync = require('child_process').execSync;
var os = require('os');
var isAgentLess = 'Y'
var readFile ;
var big_integer = require('./utils/BigInteger');
var ndExceptionCaptureSettings = require('./exception/ndExceptionCaptureSettings');
var ndExceptionMonitor = require('./exception/ndExceptionMonitor');

function MessageHandler(clientSocket)
{
    this.clientSocket = clientSocket;
    this.handleMessages();
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
    var netjsagent_version = JSON.parse(fs.readFileSync(path.resolve(path.join(__dirname,'/../package.json')))).version;

    var controlMessage = "nd_ctrl_msg_req:appName=" + agentConfReader.getInstance() + ";ndAppServerHost="
        + agentConfReader.getServerName() + ";tierName=" + agentConfReader.getTierName() + ";bciVersion="+netjsagent_version
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
}
//Used to accumulate incomplete messages received in socket
var completeData = "";
MessageHandler.prototype.handleMessages = function() {
    var clientSocket = this.clientSocket;
    //Rest complete state on creating new control connection with default values-
    completeData = "";

    clientSocket.on("data", function (data) {
        var findEOL = false;

        try {
            //1. One or more  complete messages received
            //2. Multiple complete messsages received except last
            //3. One incomplete message received

            if(data.toString().indexOf('\n') > -1) {
                var check_newLine_char = data.toString().trim().split('\n');
                //If last message not ends with new line in this case store last line in completeData after removing from data var
                //split last new line char and remaining chars add remaining chars in complete data
                findEOL = true;
                if(completeData != "") {
                    data = completeData+data.toString();

                    completeData = "";
                    if(check_newLine_char[1] && check_newLine_char[1].trim().length)
                        completeData = check_newLine_char[1];
                }
                //completeData will be set blank only if last line received end with new line
            }
            else{
                completeData = completeData+data.toString().trim();
            }

			if(findEOL) {
                //There should not be any incomplete message reached here
            var ndcMsg = data.toString().trim().split('\n');

            for(var i=0;i<ndcMsg.length;i++) {
                var clientMsg = ndcMsg[i];

                util.logger.info(agentConfReader.currentTestRun + " | Control message received from ndc:" + ndcMsg[i]);
                if (ndcMsg[i].length == 0) {
                    //util.logger.warn(Server.TestRunIDValue,"","","Invalid line found, so ignoring.");
                    continue;
                }

                if (clientMsg.trim().startsWith("nd_control_req:action=start_instrumentation") ){
                    if (clientMsg.indexOf("cavEpochDiff") === -1)
                        agentConfReader.cavEpochDiffInMills = 1388534400000;

                    if(clientMsg.indexOf("TimeStampDiff") === -1)
                        agentConfReader.diffTimeFromNDC = 0;

                    var dataArray = ndcMsg[i].split(":");
                    var messageArray = dataArray[1].split(";");
                    var action = messageArray[0].split("=");

                    if (action[1] == "start_instrumentation") {
                        try {
                            agentConfReader.isToInstrument = true;
                            agentConfReader.isTestRunning = true;
                            var currTestId = 0;

                            util.logger.info(agentConfReader.currentTestRun + " | isToInstrument : " + agentConfReader.isToInstrument);
                            util.logger.info(agentConfReader.currentTestRun + " | isTestRunning : " + agentConfReader.isTestRunning);

                            for (var i = 0; i < messageArray.length; i++) {
                                var propertyValuePairs = messageArray[i].split("=");

                                if (propertyValuePairs[0] == "testIdx") {
                                    currTestId = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | New test run started .");
                                }
								if (propertyValuePairs[0] == "enableBciDebug") {
                                    agentConfReader.enableBciDebug = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | enableBciDebug value : " +agentConfReader.enableBciDebug);
                                }
                                 if (propertyValuePairs[0] == "ndMethodMonTraceLevel") {
                                    agentConfReader.ndMethodMonTraceLevel = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | ndMethodMonTraceLevel : "+agentConfReader.ndMethodMonTraceLevel);
                                }
                                 if (propertyValuePairs[0] == "enableBackendMonTrace") {
                                    agentConfReader.enableBackendMonTrace = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | ndMethodMonTraceLevel : "+agentConfReader.enableBackendMonTrace);
                                }
								if (propertyValuePairs[0] == "enableBTMonitorTrace") {
                                    agentConfReader.enableBTMonitorTrace = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | enableBTMonitorTrace : "+agentConfReader.enableBTMonitorTrace);
                                }
                                if (propertyValuePairs[0] == "appName") {
                                    agentConfReader.instance = propertyValuePairs[1];
                                    util.initializeLogger(agentConfReader.logLevel,agentConfReader.BCILoggingMode,agentConfReader.instance)
                                    util.logger.info(currTestId + " | app name is : " + agentConfReader.instance);
                                }
                                if (propertyValuePairs[0] == "tierName") {
                                    agentConfReader.tier = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | tierName is : " + agentConfReader.tier);
                                }
                                if (propertyValuePairs[0] == "appID") {
                                    agentConfReader.appID = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | appID is : " + agentConfReader.appID);
                                }
                                if (propertyValuePairs[0] == "tierName") {
                                    agentConfReader.tier = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | tierName is : " + agentConfReader.tier);
                                }
                                if (propertyValuePairs[0] == "ndMonitorInterval") {
                                    agentConfReader.ndMonitorInterval = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | ndMonitorInterval is : " + agentConfReader.ndMonitorInterval);
                                }if (propertyValuePairs[0] == "captureHttpTraceLevel") {
                                    agentConfReader.captureHttpTraceLevel = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | captureHttpTraceLevel is : " + agentConfReader.captureHttpTraceLevel);
                                }
                                if (propertyValuePairs[0] == "ndAppServerHost") {
                                    agentConfReader.server = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | Server name is ." + agentConfReader.server);
                                }
                                if (propertyValuePairs[0] == "ndAppServerID") {
                                    agentConfReader.serverID = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | Server id is ." + agentConfReader.serverID);
                                }
                                if (propertyValuePairs[0] == "appID") {
                                    agentConfReader.appID = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | appID is : " + agentConfReader.instance);
                                }
                                if (propertyValuePairs[0] == "tierID") {
                                    agentConfReader.tierID = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | tierID is : " + agentConfReader.tier);
                                } if (propertyValuePairs[0] == "ndVectorSeparator") {
                                    agentConfReader.ndVectorSeparator = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | ndVectorSeparator is : " + agentConfReader.ndVectorSeparator);
                                }
                                if (propertyValuePairs[0] == "excludeMethodOnRespTime") {
                                    agentConfReader.excludeMethodOnRespTime = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | ExcludeMethodOnRespTime is  : " + agentConfReader.excludeMethodOnRespTime);
                                }
                                if (propertyValuePairs[0] == "enableDynamicThreshold") {
                                    agentConfReader.dynamicThreshold = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | dynamicThreshold is  : " + agentConfReader.dynamicThreshold);
                                }
                                if (propertyValuePairs[0] == "eventLoopMonitor") {
                                    agentConfReader.enable_eventLoop_monitor = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | eventLoopMonitor is  : " + agentConfReader.enable_eventLoop_monitor);
                                }
                                if (propertyValuePairs[0] == "gcProfiler") {
                                    agentConfReader.enable_garbage_profiler = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | gcProfiler is  : " + agentConfReader.enable_garbage_profiler);
                                }
                                if (propertyValuePairs[0] == "cavEpochDiff") {
                                    agentConfReader.cavEpochDiff = propertyValuePairs[1];
                                    agentConfReader.cavEpochDiffInMills = propertyValuePairs[1] * 1000;
                                    util.logger.info(currTestId + " | cavEpochDiff is  : " + agentConfReader.cavEpochDiff);
                                }
                                if (propertyValuePairs[0] == "TimeStampDiff") {
                                    agentConfReader.diffTimeFromNDC = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | diffTimeFromNDC is  : " + agentConfReader.diffTimeFromNDC);
                                }
                                if (propertyValuePairs[0] == "bciInstrSessionPct") {
                                    agentConfReader.bciInstrSessionPct = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | bciInstrSessionPct is  : " + agentConfReader.bciInstrSessionPct);
                                }
                                if (propertyValuePairs[0] == "maxCharInSeqBlob") {
                                    agentConfReader.maxCharInSeqBlob = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | maxCharInSeqBlob is  : " + agentConfReader.maxCharInSeqBlob);
                                }
                                if (propertyValuePairs[0] == "captureHTTPReqFullFp") {
                                    agentConfReader.httpReqCapturingSettings = NDHttpCaptureSettings.setHttpReqRespCaptureSettings(propertyValuePairs[1],'HTTPCaptureReqFullFP',true)
                                    //agentConfReader.maxCharInSeqBlob = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | HttpRequestCapturingSettings are  : " , agentConfReader.httpReqCapturingSettings);
                                }
                                if (propertyValuePairs[0] == "captureHTTPRespFullFp") {
                                    agentConfReader.httpResCapturingSettings = NDHttpCaptureSettings.setHttpReqRespCaptureSettings(propertyValuePairs[1],'HTTPCaptureResFullFP',false)
                                    //agentConfReader.maxCharInSeqBlob = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | HttpResponseCapturingSettings is  : " ,agentConfReader.httpResCapturingSettings);
                                }
                                if (propertyValuePairs[0] == "enableBTMonitor") {
                                    if(propertyValuePairs[1] > 0){
                                        agentConfReader.isBTMonitor = true ;
                                        ndBTMonitor.handleBtMonitor();
                                        util.logger.info(currTestId + " | enableBTMonitor is  : " + agentConfReader.isBTMonitor);
                                    }
                                }
                                if (propertyValuePairs[0] == "enableBackendMonitor") {
                                    if(propertyValuePairs[1] > 0) {
                                        agentConfReader.isBackendMonitorEnabled = true;
                                        ndBackendMonitor.handleBackendMonitor();
                                        util.logger.info(currTestId + " | enableBackendMonitor is  : " + agentConfReader.isBackendMonitorEnabled);
                                    }
                                }
                                if (propertyValuePairs[0] == "ndFlowpathMasks") {
                                    var FP_Instances = propertyValuePairs[1].split("%20");

                                    if(FP_Instances[0].indexOf('0x') !== -1)
                                        FP_Instances[0]=FP_Instances[0].split('0x')[1]

                                    agentConfReader.flowPathInstanceInitialID = (big_integer(FP_Instances[0],16)).toString();
                                    agentConfReader.timeStampMask = parseInt((FP_Instances[1]), 16);
                                    agentConfReader.seqNoDigits = parseInt((FP_Instances[2]), 16);
                                    agentConfReader.seqNumMask = parseInt((FP_Instances[3]), 16);
                                }
                                var property = propertyValuePairs[0];
                                var value = propertyValuePairs[1];

                                agentConfReader[property] = value;
                            }
                            agentConfReader.cavEpochDiffInMills = agentConfReader.cavEpochDiffInMills - agentConfReader.diffTimeFromNDC ;
                            util.logger.info(currTestId," | cavEpochDiffInMills : ",agentConfReader.cavEpochDiffInMills);
                            agentConfReader.vectorPrefix = agentConfReader.tier + agentConfReader.ndVectorSeparator + agentConfReader.server + agentConfReader.ndVectorSeparator + agentConfReader.instance + agentConfReader.ndVectorSeparator;
                            agentConfReader.vectorPrefixID = agentConfReader.tierID + "|" + agentConfReader.appID + "|";
                            /*
                             if Test run is changed then reseting all the maps and generating FP_Mask again
                             */
                            if (agentConfReader.previousTestRun !== currTestId) {
                                util.logger.info(currTestId + " | Cleaning all maps");
                                instPrfParseobj.resetInstrListOnStart();
                                btConfig.resetBtId();
                                ndSQLMetaData.clear();
                                //ndMethodMetaData.clear();
                                ndMethodMonitor.clearMmMap();
                                ndExceptionMonitor.clearExceptionMonMap();
                                NDHttpConditionStats.resetValues();

                                btManager.clear();
                                agentConfReader.backendRecordMap = new Object();
                                agentConfReader.backendMetaMap = new Object();
                                agentConfReader.flowMap = new Object();
                                agentConfReader.backendID = 0;
                                agentConfReader.seqId = 0;
                                flowpathHandler.clearCounter();
                            }
                            //setting Test Run id comming from ndc as a current test run id
                            agentConfReader.currentTestRun = currTestId;
                            instPrfParseobj.processInstrFileList(messageArray, clientSocket);
                            //fileBasedKeywordGenricFile.parseFileBasedKeywords(messageArray, clientSocket);
                            ndExceptionCaptureSettings.parseExceptionCaptureSettings(clientMsg);

                            otherKeywordHandler.parsingKeywordvalue(messageArray);  //Parse all keyword other than file based keywords
                            agentConfReader.dataConnHandler = new dataConnectionHandler();
                            agentConfReader.dataConnHandler.createDataConn();

                            agentConfReader.autoSensorConnHandler = new AutoSensorConnectionHandler();
                            agentConfReader.autoSensorConnHandler.createAutoSensorConn();

                            if(asSettingObj.asSampleInterval > 0) {
                                asMangerObj.startMonitor();   //Starting AS monitor for dumping 53 records on basis of reportInterval keyword
                            }
                            if (agentConfReader.dataConnHandler && agentConfReader.autoSensorConnHandler) {
                                if (1 == agentConfReader.enable_eventLoop_monitor) {                    //Starting the event loop manager
                                    util.logger.info(agentConfReader.currentTestRun + " | Initializing event_loop_monitor .");
                                    eventLoopMonitor.init();
                                }

                                if (1 == agentConfReader.enable_garbage_profiler) {                    //Starting the event loop manager
                                    util.logger.info(agentConfReader.currentTestRun + " | Initialized heap_gc_monitor .");
                                    heapGcMonitor.init();
                                }
                                ndMethodMonitor.startMethodMonitor();
                                ndExceptionMonitor.startExceptionMonitor();
                                NDHttpConditionStats.startHttpConditioMonitor();
                            }

                            if (agentConfReader.settingFileMode.toUpperCase() == "EXCLUSIVE") {
                                var data = fs.readFileSync(agentConfReader.ndSettingFile).toString()
                                var list = data.trim().split('\n');
                                for(i in list) {
                                    if(list[i].indexOf('#tier') != -1)
                                        list[i] = 'tier='+agentConfReader.tier;
                                    if(list[i].indexOf('#server') != -1)
                                        list[i] = 'server='+agentConfReader.server;
                                    if(list[i].indexOf('#instance') != -1) {
                                        list[i] = 'instance=' + agentConfReader.instance;
                                    }
                                }
                                list = list.join('\n')
                                fs.writeFile(agentConfReader.ndSettingFile, list, function (err) {
                                    if (err)console.log(err);
                                });
                            }
                        }
                        catch (err) {
                            util.logger.warn(err);
                        }
                    }
                }

                //Control message for closing the connection
                else if (clientMsg.trim().startsWith("nd_control_req:action=stop_instrumentation")) {
                    var dataArray = clientMsg.split(":");
                    var messageArray = dataArray[1].split(";");
                    var action = messageArray[0].split("=");
                    var status = messageArray[1].split("=")[1];

                    util.logger.info(agentConfReader.currentTestRun + " | stop_instrumentation message from ndc ")

                    if (status == "stopping") {
                        if (agentConfReader.dataConnHandler && agentConfReader.autoSensorConnHandler) {

                            MessageHandler.dumpMethodLastRecord(10, agentConfReader.dataConnHandler);

                            agentConfReader.isToInstrument = false;
                            agentConfReader.isTestRunning = false;
                            agentConfReader.isBTMonitor = false;
                            agentConfReader.isBackendMonitorEnabled = false;
                            agentConfReader.previousTestRun = agentConfReader.currentTestRun;
                            agentConfReader.currentTestRun = 0;
                            //creating control message
                            controlMessage = "nd_control_rep:action=stop_instrumentation;status=" + status + ";result=Ok;" + "\n";

                            util.logger.info(agentConfReader.currentTestRun + " | Destroying the Data and AutoSensor connection . ")
                            agentConfReader.dataConnHandler.closeConnection();
                            delete agentConfReader.dataConnHandler;

                            agentConfReader.autoSensorConnHandler.closeConnection();
                            delete agentConfReader.autoSensorConnHandler;

                            if(asSettingObj.asSampleInterval > 0 ) {
                                asMangerObj.stopMonitor();  //Stopping AS monitor from dumping 53 records.
                            }

                            util.logger.info(agentConfReader.currentTestRun + " | Clearing all maps ");
                            //clean all maps
                            heapGcMonitor.stopHeapGC();
                            eventLoopMonitor.stopEvnetloopMonitor();
                            NDHttpConditionStats.stopHttpConditioMonitor();
                            ndBackendMonitor.handleBackendMonitor();
                            ndBTMonitor.handleBtMonitor();
                            ndMethodMonitor.stopMethodMonitor();
                            ndExceptionMonitor.stopExceptionMonitor();

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

				else if (clientMsg.trim().startsWith("nd_control_rep:action=file")) {
                    var dataArray = clientMsg.split(":");
                    var messageArray = dataArray[1].split(";");
                    var action = messageArray[0].split("=");

                    try {
                        if (action[1] == "file") {
                            mthMonitorObj = fileBasedKeywordGenricFile.readFileContent(messageArray[1], clientSocket);
                            readFile = true;
                        }
                    }
                    catch (err) {
                        util.logger.warn(err);
                        readFile = false;
                    }
                }
                else{
                    instPrfParseobj.processInstrFile(ndcMsg[i], clientSocket);
                }
            }
        }
	}
        catch(err){util.logger.warn(err)}
    })
};

MessageHandler.parseAllFieldsAndSetInModelIfAllSuccess = function (clientMsg,controlSocket){
    if(clientMsg.indexOf(";") !== -1) {
        var allArguments = clientMsg.split(";");

        for (var i in allArguments) {
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
            }
            else if (allArguments[i].startsWith("enableBTMonitor")) {
                if (strKeywordValue > 0) {
                    agentConfReader.isBTMonitor = true;
                    ndBTMonitor.handleBtMonitor();
                    util.logger.info(agentConfReader.currentTestRun + " | enableBTMonitor is  : " + agentConfReader.isBTMonitor);
                }
                else {
                    agentConfReader.isBTMonitor = false;
                    ndBTMonitor.handleBtMonitor();
                }
            }
            else if (allArguments[i].startsWith("enableBackendMonitor=")) {
                if (strKeywordValue[1] > 0) {
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
            var keyword = 'ndMethodMonFile';
            ndMethodMonitor.clearMmMap();
            ndMethodMonitor.clearMMList();

            controlSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
            return;
        }
        if (clientMsg.indexOf("BTRuleConfig=NA;") != -1) {
            var keyword = 'BTRuleConfig';

            fileBasedKeywordGenricFile.clearFileMap(keyword);
            btManager.clear();
            btGlobalRule.clearGlobalObj();
            btConfig.isPatternBasedRulePresnt = false;
            btRuleList.clearList();
            btConfig.resetBtId();

            controlSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
            return;
        }
        if (clientMsg.indexOf("ndBackendNamingRulesFile=NA;") != -1) {
            backendRecord.clearBackendRuleList()
            controlSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
            return;
        }
        if (clientMsg.indexOf("HTTPStatsCondCfg=NA") != -1) {
            NDHttpConditionStats.resetValues();
            controlSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
            return;
        }
        if (clientMsg.indexOf("captureCustomData=NA") != -1) {
            CaptureCustomData.resetValues();
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
            || (clientMsg.indexOf("captureCustomData") != -1)) {

            var messageArray = clientMsg.split(';');
            instPrfParseobj.processInstrFileList(messageArray, controlSocket);
            controlSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
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
    try {
        var respMessage = "";
        if (isHeapDumpInProgress) {
            try { //log a message and return from here
                //send error message to ndc and return
                respMessage = "nd_meta_data_rep:action=get_heap_dump;result=Error:<Unable to take heapDump Because Of BCI is already busy for previous request. previous request time :" + lastHeapdumpReqTime + ".>;\n";
                clientSocket.write(respMessage);

                return;
            } catch (err) {
                util.logger.warn(agentConfReader.currentTestRun + " | nd_meta_data_rep:action=get_heap_dump;result=Error:<Unable to take heapDump Because Of BCI is already busy for previous request. previous request time :" + lastHeapdumpReqTime + ".>;\n" + err)
            }

        }

        //Save the requested time for next time logging in case
        lastHeapdumpReqTime = new Date().toString();

        //validate and start heapdump taking
        var isSuccess = MessageHandler.findParametersAndValidate(clientMsg, clientSocket);
    }
    catch(e)
    {
        util.logger.warn(e);
    }

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

module.exports = MessageHandler;