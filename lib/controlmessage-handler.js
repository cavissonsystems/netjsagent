/**
 * Created by bala on 23/7/15.
 */

var agentConfReader = require("./agent-setting");
var flowpathHandler = require("./flowpath-handler");
var methodHadler = require("./methodManager.js");
var dataConnectionHandler = require("./dataconnection-handler");
var AutoSensorConnectionHandler = require('./autoSensorConnection-handler');
var ndMetaDataRecoveryProcess = require('./metaData/ndMetaDataRecoveryProcess');
var eventLoopMonitor = require('./event_loop_moitor/ndEventLoopMonitor.js');
var heapGcMonitor = require('./heap_gc_monitor/ndHeapGCMonitor.js')
var ndBTMonitor = require('./BT/ndBTMonitor.js')
var ndBackendMonitor = require('./backend/ndBackendMonitor.js')
var ndMethodMetaData =  require('./metaData/ndMethodMetaData');
var ndBTMetaData = require('./metaData/ndBTMetaData');
var ndSQLMetaData = require('./metaData/ndSQLMetaData');
var ndMethodMonitor = require('./method-monitor/ndMethodMonitor.js');
var btGlobalRule = require ('./BT/btGlobalRule.js');
var v8_profiler = require('./v8-profiler');
var v8 = require('v8-profiler');
var path = require('path');
var util = require('./util');
var Long = require('long');
var fs = require('fs');
var list = [];  
var btConfig = require('./BT/btConfig');
var btManager = require('./BT/btManager.js');
var btRuleList = require('./BT/btPatternRule.js')
var dataConnection;
var autoSensorConnection;
var status ;
var isHeapDumpInProgress = false;
var lastHeapdumpReqTime = "";
var heapDumpCount = 0;
var instPrfParseobj = require('./instrProfileParser');
var mthMonitorObj ;
var fileBasedKeywordGenricFile = require('./ndFileBasedKeywordHandler');
//var exec = require('child_process').execSync;
var execSync = require('child_process').execSync;
var os = require('os');
var getIsAgentLess = 'Y'
var settingData ;
var readFile ;


function MessageHandler(clientSocket)
{
    this.clientSocket = clientSocket;
    this.handleMessages();
}

MessageHandler.prototype.sendIntialMessages = function() {

    var data = execSync('ps -ef |grep cmon').toString();
    if(data.indexOf('CavMonAgent') > -1)
        getIsAgentLess = 'N';

    var processId = process.pid;

    var controlMessage = "nd_ctrl_msg_req:appName=" + agentConfReader.getInstance() + ";ndAppServerHost="
        + agentConfReader.getServerName() + ";tierName=" + agentConfReader.getTierName() + ";bciVersion=VERSION 4.1.2.Local BUILD 18"
        + ";bciStartTime=" + agentConfReader.getBCIStartUpTime() + ";ndHome=/opt/cavisson/netdaignostic;pid=" + processId
        +";BCITimeStamp="+ new Date().getTime() + ";serverIp="+this.clientSocket.localAddress+ ";hostName="+os.hostname()
        + ";isAgentLess="+ getIsAgentLess+ ";jvmType=NodeJS"+ ";javaVersion="+process.version
        + ";javaHome="+process.cwd()+ ";machineType="+os.type()+"Ex"+";agentType=NodeJS;"+"\n";

   /* var controlMessage = "nd_ctrl_msg_req:appName=" + agentConfReader.getInstance() + ";ndAppServerHost="
        + agentConfReader.getServerName() + ";tierName=" + agentConfReader.getTierName() + ";bciVersion=VERSION 4.1.2.Local BUILD 18"
        + ";bciStartTime=" + agentConfReader.getBCIStartUpTime() + ";ndHome=/opt/cavisson/netdaignostic;pid=" + processId + "\n";
*/

    util.logger.info(agentConfReader.currentTestRun+" | Message send to ndc : "+controlMessage);
    this.clientSocket.write(controlMessage);
}

var completeData = "";
MessageHandler.prototype.handleMessages = function() {
    var clientSocket = this.clientSocket;

    clientSocket.on("data", function (data) {
        var findEOL = false;

        try {
				if(data.toString().indexOf('\n') > -1) {
                findEOL = true;
                if(completeData != "")
                {
                    data = completeData+data.toString();
                    completeData = "";
                }
            }
            else{
                completeData = completeData+data.toString().trim();
            }
			if(findEOL) {
            var ndcMsg = data.toString().trim().split('\n');

            for(var i=0;i<ndcMsg.length;i++) {

                util.logger.info(agentConfReader.currentTestRun + " | Control message received from ndc:" + ndcMsg[i]);
				if (ndcMsg[i].length == 0) {
                    //util.logger.warn(Server.TestRunIDValue,"","","Invalid line found, so ignoring.");
                    continue;
				}
                console.log("control message received from ndc:" + ndcMsg[i]);

                var dataArray = ndcMsg[i].split(":");
                //var clientMsg = "nd_meta_data_req:action=get_heap_dump;File=/home/netstorm/Controller_bibhu/ndDump.log;live=1;Tier=NodeJS;Server=Mew;Instance=Mew;";
                var clientMsg = ndcMsg[i];

                if (dataArray[0] == "nd_ctrl_msg_rep") {
                    var messageArray = dataArray[1].toString().split(";");
                }

                /*
                 For CPU Profiling
                 */

                if (dataArray[0] == "nd_meta_data_req") {       // dataArray[0] == "nd_meta_data_req") {

                    var messageArray = dataArray[1].split(";");

                    var action = messageArray[0].split("=");

                    //For metaData recovery, now we are sending some dummy value, in future we will make this response with original value

                    if (clientMsg.trim().startsWith("nd_meta_data_req:action=send_meta_data;")) {
                        ndMetaDataRecoveryProcess.processClientMessage(clientMsg, clientSocket);
                        clientSocket.write("nd_meta_data_rep:status=complete;\n");
                    }

                    if (clientMsg.trim().startsWith("nd_meta_data_req:action=get_thread_dump;")) {

                        //This message needs BCIAgent to take threaddump
                        //log the cline message
                        //start the threaddump processor
                        //send the completion response
                        //if error send the response

                        var compressMode = false;

                        if (dataArray.indexOf(";CompressMode=1;") != -1)
                            compressMode = true;

                        try {
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
                }

                if(clientMsg.trim().startsWith("nd_control_req:action=modify;"))
                {
                   // instrProfileParseSuccess = true;//for every instrument profile starting this will be true, if during any failure occur it will false
                    /*if(!controlCommunicationBusyFlag)
                     sendOutput("nd_control_rep:result=Error:<Unable to process modify message because of no control connection is on established." + '\n');
                     else*/

                    if (!agentConfReader.isTestRunning)
                        clientSocket.write("nd_control_rep:result=Error:<Unable to process modify message because of stop instrument recieved or startInstrument not recieved." + '\n');
                    else
                        MessageHandler.handleRunTimeChangeCase(clientMsg,clientSocket);
                }

                if (dataArray[0] == "nd_control_req") {
                    var messageArray = dataArray[1].split(";");

                    var action = messageArray[0].split("=");

                    if (action[1] == "start_instrumentation") {

                        agentConfReader.isToInstrument = true;
                        agentConfReader.isTestRunning = true;
                        var currTestId;

                        util.logger.info(agentConfReader.currentTestRun + " | isToInstrument : " + agentConfReader.isToInstrument);
                        util.logger.info(agentConfReader.currentTestRun + " | isTestRunning : " + agentConfReader.isTestRunning);

                        try {
                            for (var i = 0; i < messageArray.length; i++) {

                                var propertyValuePairs = messageArray[i].split("=");

                                //appName=svr26Atg;appID=2;tierName=Tier0;tierID=1;ndAppServerHost=AppServer26;ndAppServerID=1;

                                if (propertyValuePairs[0] == "testIdx") {
                                    currTestId = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | New test run started .");
                                }

                                if (propertyValuePairs[0] == "appName") {
                                    agentConfReader.instance = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | app name is : " + agentConfReader.instance);
                                }

                                if (propertyValuePairs[0] == "tierName") {
                                    agentConfReader.tier = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | tierName is : " + agentConfReader.tier);
                                }

                                if (propertyValuePairs[0] == "ndMonitorInterval") {
                                    agentConfReader.ndMonitorInterval = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | ndMonitorInterval is : " + agentConfReader.ndMonitorInterval);
                                }

                                if (propertyValuePairs[0] == "ndAppServerHost") {
                                    agentConfReader.server = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | Server name is ." + agentConfReader.server);
                                }

                                if (propertyValuePairs[0] == "appID") {
                                    agentConfReader.appID = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | appID is : " + agentConfReader.instance);
                                }

                                if (propertyValuePairs[0] == "tierID") {
                                    agentConfReader.tierID = propertyValuePairs[1]
                                    util.logger.info(currTestId + " | tierID is : " + agentConfReader.tier);
                                }


                                if (propertyValuePairs[0] == "cavEpochDiff") {
                                    agentConfReader.cavEpochDiff = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | cavEpochDiff is  : " + agentConfReader.cavEpochDiff);
                                }

                                if (propertyValuePairs[0] == "bciInstrSessionPct") {
                                    agentConfReader.bciInstrSessionPct = propertyValuePairs[1];
                                    util.logger.info(currTestId + " | bciInstrSessionPct is  : " + agentConfReader.bciInstrSessionPct);
                                }

                                if (propertyValuePairs[0] == "ndFlowpathMasks") {
                                    FP_Instances = propertyValuePairs[1].split("%20");
                                    var instance_id_fromNDC = (FP_Instances[0]);
                                    if (instance_id_fromNDC.length > 8) {
                                        var making_id = instance_id_fromNDC.split("x");
                                        var msb = '0x' + making_id[1].substring(0, making_id[1].length / 2);
                                        var lsb = '0x' + making_id[1].substring(making_id[1].length / 2, making_id[1].length);
                                        agentConfReader.flowPathInstanceInitialID = new Long(lsb, msb).toString();
                                    }
                                    agentConfReader.timeStampMask = parseInt((FP_Instances[1]), 16);
                                    agentConfReader.seqNoDigits = parseInt((FP_Instances[2]), 16);
                                    agentConfReader.seqNumMask = parseInt((FP_Instances[3]), 16);
                                }
                                var property = propertyValuePairs[0];
                                var value = propertyValuePairs[1];

                                agentConfReader[property] = value;

                            }

                            /*
                             if Test run is changed then reseting all the maps and generating FP_Mask again
                             */
                            if (agentConfReader.currentTestRun != currTestId) {
                                util.logger.info(currTestId + " | Cleaning all maps");
                                instPrfParseobj.resetInstrListOnStart();
                                ndBTMetaData.clear();
                                ndSQLMetaData.clear();
                                ndMethodMetaData.clear();
                                ndMethodMonitor.clearMmMap();

                                btManager.clear()
                                //methodHadler.clearMap();

                                agentConfReader.generateFPMask();

                                agentConfReader.backendRecordMap = new Object();
                                agentConfReader.backendMetaMap = new Object();
                                agentConfReader.flowMap = new Object();
                                agentConfReader.backendID = 0;
                                agentConfReader.seqId = 0;
                            }

                            //setting Test Run id comming from ndc as a current test run id
                            agentConfReader.currentTestRun = currTestId;

                            instPrfParseobj.processInstrFileList(messageArray, clientSocket);
                            fileBasedKeywordGenricFile.parseFileBasedKeywords(messageArray, clientSocket);
                            //dataConnection = new dataConnectionHandler.createDataConn();

                            agentConfReader.dataConnHandler = new dataConnectionHandler();
                            agentConfReader.dataConnHandler.createDataConn();

                            agentConfReader.autoSensorConnHandler = new AutoSensorConnectionHandler();
                            agentConfReader.autoSensorConnHandler.createAutoSensorConn();

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
                                ndBTMonitor.startBtMonitor();
                                ndBackendMonitor.init();
                            }

                            if (agentConfReader.settingFileMode == "exclusive") {
                                var textFile = '#Mode will be shared or exclusive , if many instance are sharing then it,ll be shared#\r\n\n' + 'Mode=' + agentConfReader.settingFileMode + '\r\n\n' + 'tier=' + agentConfReader.tier + '\r\n\n' + 'server=' + agentConfReader.server + '\r\n\n' + 'instance=' + agentConfReader.instance + '\r\n\n' + 'ndcHost=' + agentConfReader.getNDCHost() + '\r\n\n' + 'ndcPort=' + agentConfReader.getPort() + '\r\n';
                                fs.writeFile(agentConfReader.ndSettingFile, textFile, function (err) {
                                    if (err)console.log(err);
                                });
                            }
                        }
                        catch (err) {
                            util.logger.warn(err);
                        }
                    }


                    //Control message for closing the connection
                    else if (action[1] == "stop_instrumentation") {
                        status = messageArray[1].split("=")[1];

                        util.logger.info(agentConfReader.currentTestRun + " | stop_instrumentation message from ndc ")

                        if (status == "stopping") {
                            if (agentConfReader.dataConnHandler && agentConfReader.autoSensorConnHandler) {

                                MessageHandler.dumpMethodLastRecord(10, agentConfReader.dataConnHandler);

                                agentConfReader.isToInstrument = false;
                                agentConfReader.isTestRunning = false;
                                agentConfReader.currentTestRun = 0;

                                //creating control message
                                controlMessage = "nd_control_rep:action=stop_instrumentation;status=" + status + ";result=Ok;" + "\n";

                                util.logger.info(agentConfReader.currentTestRun + " | Destroying the Data and AutoSensor connection . ")
                                agentConfReader.dataConnHandler.closeConnection();
                                delete agentConfReader.dataConnHandler;

                                agentConfReader.autoSensorConnHandler.closeConnection();
                                delete agentConfReader.autoSensorConnHandler;

                                util.logger.info(agentConfReader.currentTestRun + " | Clearing all maps ");
                                //clean all maps

                                heapGcMonitor.stopHeapGC();
                                eventLoopMonitor.stopEvnetloopMonitor();
                                ndBTMonitor.stopBTMonitor();
                                ndBackendMonitor.stopBackendMonitor();
                                ndMethodMonitor.stopMethodMonitor();

                                util.logger.info(agentConfReader.currentTestRun + " | " + controlMessage);
                                clientSocket.write(controlMessage);               //Stopping the connection
                            }
                        }
                    }
                }

				else if (dataArray[0] == "nd_control_rep") {

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
                else if(readFile) {
                        try {
                            if(dataArray.indexOf("#end") > -1) {
                                fileBasedKeywordGenricFile.setFileContent(list);
                                readFile = false;
                                list = [];
                            }
                            else
                                list.push(dataArray);
                        }
                        catch (err) {
                            util.logger.warn(err);
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

MessageHandler.handleRunTimeChangeCase = function(clientMsg,controlSocket) {
    try {
        if (clientMsg.indexOf("size=0;lmd=") != -1) {
            controlSocket.write("nd_control_rep:action=instrumentation_profile;result=Error:<Could not recieve modify message because of instrument profile having size 0.Check Instrument profile and retry again.>" + '\n');
            util.logger.info(agentConfReader.currentTestRun + " | nd_control_rep:action=instrumentation_profile;result=Error:<Could not recieve modify message because of instrument profile having size 0.Check Instrument profile and retry again.>" + '\n');
            return;//No need to process more forwards
        }

        if (clientMsg.indexOf("ndMethodMonFile=NA;") != -1) {
            var keyword = 'ndMethodMonFile';
            fileBasedKeywordGenricFile.clearFileMap(keyword);
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

            controlSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
            return;
        }
        else if ((clientMsg.indexOf("HTTPStatsCondCfg") != -1) || (clientMsg.indexOf("NDHTTPRe") != -1)
            || (clientMsg.indexOf("ndMethodMonFile") != -1) || (clientMsg.indexOf("ndExceptionMonFile") != -1)
            || (clientMsg.indexOf("NDAppLogFile") != -1) || (clientMsg.indexOf("ndBackendMonFile") != -1)
            || (clientMsg.indexOf("cavNVURLFile") != -1) || (clientMsg.indexOf("NDInterfaceFile") != -1)
            || (clientMsg.indexOf("NDEntryPointsFile") != -1) || (clientMsg.indexOf("BTTConfig") != -1)
            || (clientMsg.indexOf("BTRuleConfig") != -1) || (clientMsg.indexOf("BTErrorRules") != -1)
            || (clientMsg.indexOf("ndBackendNamingRulesFile") != -1) || (clientMsg.indexOf("generateExceptionConfFile") != -1)) {

            var messageArray = clientMsg.split(';');
            fileBasedKeywordGenricFile.parseFileBasedKeywords(messageArray, controlSocket);
            controlSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
            return;
        }

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
    var isOnlyLive = true;
    var heapDirExists =false;
    try {
        for (var i in allFields) {

            //Collect file path and validate if parent dir is present or not ??
            if (-1 != allFields[i].indexOf("File=")) {

                var file_path = allFields[i].split("=")[1].toString();
                if (-1 != file_path.indexOf('.'))
                    file_path = file_path.split('.')[0] + '.heapsnapshot';
                else
                    file_path = file_path + '.heapsnapshot';

                util.logger.info(agentConfReader.currentTestRun+" | File path for Heap Dump is : "+file_path);

                fileParentDir = file_path.substring(0, file_path.lastIndexOf(path.sep));

                if (fs.existsSync(fileParentDir)) {
                    heapDirExists = true;
                }

                //file name -> preety_heap_dump.txt
                fileName = file_path.substring(file_path.lastIndexOf(path.sep) + 1, file_path.length);

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
    }
    catch (e) {
        clientSocket.write("nd_meta_data_rep:action=get_heap_dump;result=Error:<Unable to take heapDump, please check in agent logs>;\n");
        util.logger.warn(agentConfReader.currentTestRun+" |  Unable to take heapDump " + e);
    }

    return true;
};


module.exports = MessageHandler;
