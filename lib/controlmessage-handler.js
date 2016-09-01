/**
 * Created by bala on 23/7/15.
 */

var agentConfReader = require("./agent-setting");
var flowpathHandler = require("./flowpath-handler");
var DataConnectionHandler = require("./dataconnection-handler");
var AutoSensorConnectionHandler = require('./autoSensorConnection-handler');
var v8_profiler = require('./v8-profiler');
var v8 = require('v8-profiler');
var path = require('path');
var util = require('./util');
var Long = require('long');
var fs = require('fs');
var dataConnection;
var autoSensorConnection;
var status ;
var isHeapDumpInProgress = false;
var lastHeapdumpReqTime = "";
var heapDumpCount = 0;

function MessageHandler(clientSocket)
{
  this.clientSocket = clientSocket;
  this.handleMessages();
}

MessageHandler.prototype.handleMessages = function() {
    var clientSocket = this.clientSocket;
    var processId = process.pid;

    var controlMessage = "nd_ctrl_msg_req:appName=" + agentConfReader.getInstance() + ";ndAppServerHost="
        + agentConfReader.getServerName() + ";tierName=" + agentConfReader.getTierName() + ";bciVersion=VERSION 4.1.2.Local BUILD 18"
        + ";bciStartTime=" + agentConfReader.getBCIStartUpTime() + ";ndHome=/opt/cavisson/netdaignostic;pid=" + processId + "\n";


    util.logger.info(controlMessage);
    clientSocket.write(controlMessage);

    clientSocket.on("data", function (data) {


        console.log("control message from ndc:" + data.toString());

        var dataArray = data.toString().split(":");
        //var clientMsg = "nd_meta_data_req:action=get_heap_dump;File=/home/netstorm/Controller_bibhu/ndDump.log;live=1;Tier=NodeJS;Server=Mew;Instance=Mew;";
        var clientMsg = data.toString();

        if (dataArray[0] == "nd_ctrl_msg_rep") {

            var messageArray = dataArray[1].toString().split(";");
        }

        /*
         For CPU Profiling
         */

        if (dataArray[0] == "nd_meta_data_req") {       // dataArray[0] == "nd_meta_data_req") {

            var messageArray = dataArray[1].split(";");

            var action = messageArray[0].split("=");

            if (clientMsg.trim().startsWith("nd_meta_data_req:action=get_thread_dump;")) {

                //This message needs BCIAgent to take threaddump
                //log the cline message
                //start the threaddump processor
                //send the completion response
                //if error send the response

                var compressMode = false;

                if (dataArray.indexOf(";CompressMode=1;") != -1)
                    compressMode = true;

                if (1 == agentConfReader.enable_cpu_profiling) {
                    util.logger.info("Going to take CPU Profiling for 10 min .");
                    v8_profiler.startCpuProfiling(clientSocket);
                }
                else
                    util.logger.warn("Enable keyword 'enable_cpu_profiling=1' in file 'ndKeywordConfigurationFile' to start CPU Profiling ")
            }

            else if (clientMsg.trim().startsWith("nd_meta_data_req:action=get_heap_dump;")) {
                try {
                    MessageHandler.handleClientMessageForTakingHeapDump(clientMsg,clientSocket);
                }
                catch (e) {
                    clientSocket.write("nd_meta_data_rep:action=get_heap_dump;result=Error:<Unable to take heapDump Because Of Exception.Check BCI error log for detail.>;\n");
                }

            }
        }

        if (dataArray[0] == "nd_control_req") {
            var messageArray = dataArray[1].split(";");

            var action = messageArray[0].split("=");


            if (action[1] == "start_instrumentation") {

                agentConfReader.isToInstrument = true;
                // agentConfReader.btrecordMap = new Object();

                try {
                    for (var i = 0; i < messageArray.length; i++) {

                        var propertyValuePairs = messageArray[i].split("=");

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
                    dataConnection = new DataConnectionHandler().createDataConn();
                    agentConfReader.dataConnHandler = dataConnection;

                    autoSensorConnection = new AutoSensorConnectionHandler().createAutoSensorConn();
                    agentConfReader.autoSensorConnHandler = autoSensorConnection;
                }
                catch (err) {
                    util.logger.warn(err);
                }
            }


            //Control message for closing the connection
            else if (action[1] == "stop_instrumentation") {
                status = messageArray[1].split("=")[1];

                if (status == "stopping") {
                    if (agentConfReader.dataConnHandler && agentConfReader.dataConnHandler.client) {
                        agentConfReader.isToInstrument = false;

                        //creating control message
                        controlMessage = "nd_control_rep:action=stop_instrumentation;status=" + status + ";result=Ok;" + "\n";

                        agentConfReader.dataConnHandler.client.end();
                        agentConfReader.dataConnHandler.client.destroy();
                        agentConfReader.autoSensorConnHandler.client.end();
                        agentConfReader.autoSensorConnHandler.client.destroy();

                        util.logger.info("NDC is stopped : " + controlMessage);
                        clientSocket.write(controlMessage);               //Stopping the connection
                    }
                }
            }
        }
    })
};

MessageHandler.handleClientMessageForTakingHeapDump = function(clientMsg,clientSocket) {
    var respMessage = "";
    if(isHeapDumpInProgress )
    {
        try{ //log a message and return from here
            //send error message to ndc and return
            respMessage = "nd_meta_data_rep:action=get_heap_dump;result=Error:<Unable to take heapDump Because Of BCI is already busy for previous request. previous request time :"+ lastHeapdumpReqTime +".>;\n" ;
            clientSocket.write(respMessage);

            return;
        }catch(err){util.logger.warn("nd_meta_data_rep:action=get_heap_dump;result=Error:<Unable to take heapDump Because Of BCI is already busy for previous request. previous request time :"+ lastHeapdumpReqTime +".>;\n"+err )}

    }

    //Save the requested time for next time logging in case
    lastHeapdumpReqTime = new Date().toString();

    //validate and start heapdump taking
    var isSuccess = MessageHandler.findParametersAndValidate(clientMsg,clientSocket);

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
    }catch(err){util.logger.warn("Error in finding path for HeapDump ."+err)}

    try {
        if (!fs.existsSync(file_path)) {
            if (1 == agentConfReader.enable_heapdump && heapDirExists ) {
                isHeapDumpInProgress = true;
                util.logger.info("Going to take Heap dump for 10 min .");
                v8_profiler.takeHeapSnapShot(file_path, clientSocket);
            }
            else
                util.logger.warn("Enable keyword 'enable_heapdump=1' in file 'ndKeywordConfigurationFile' to take Heap dump ")
        }
    }
    catch (e) {
        clientSocket.write("nd_meta_data_rep:action=get_heap_dump;result=Error:<Unable to take heapDump Because Of Exception in controlmessage-handler>;\n");
    }

    isHeapDumpInProgress = false;

    try {
        respMessage = "nd_meta_data_rep:action=get_heap_dump;result=Ok:<Started....Please check BCI Debug/Error logs for more details & also check  " + fileName + " where heapdumps are captured.>;\n";
        clientSocket.write(respMessage);
    }catch(err){util.logger.warn(err)}

    return true;
};


module.exports = MessageHandler;
