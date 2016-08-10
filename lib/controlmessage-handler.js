/**
 * Created by bala on 23/7/15.
 */

var agentConfReader = require("./agent-setting");
var flowpathHandler = require("./flowpath-handler");
var DataConnectionHandler = require("./dataconnection-handler");
var AutoSensorConnectionHandler = require('./autoSensorConnection-handler');
var v8_profiler = require('./v8-profiler');
var util = require('./util');
var Long = require('long');
var dataConnection;
var autoSensorConnection;
var status ;

function MessageHandler(clientSocket)
{
  this.clientSocket = clientSocket;
  this.handleMessages();
}

MessageHandler.prototype.handleMessages = function()
{
  var clientSocket = this.clientSocket;
  var processId = process.pid;

  var controlMessage = "nd_ctrl_msg_req:appName=" + agentConfReader.getInstance() + ";ndAppServerHost="
        + agentConfReader.getServerName() + ";tierName=" + agentConfReader.getTierName() + ";bciVersion=VERSION 4.1.2.Local BUILD 18"
        + ";bciStartTime=" + agentConfReader.getBCIStartUpTime() + ";ndHome=/opt/cavisson/netdaignostic;pid=" + processId + "\n";


    util.logger.info(controlMessage);
  clientSocket.write(controlMessage);

  clientSocket.on("data", function(data)
  {


      console.log("control message from ndc:" + data.toString());


      var dataArray = data.toString().split(":");

      if(dataArray[0] == "nd_ctrl_msg_rep")
      {

          var messageArray = dataArray[1].toString().split(";");
      }

      /*
       For CPU Profiling
       */

      if (dataArray[0] == "nd_meta_data_req") {

      var messageArray = dataArray[1].split(";");

      var action = messageArray[0].split("=");

        if(action[1] == "get_thread_dump") {
            //This message needs BCIAgent to take threaddump
            //log the cline message
            //start the threaddump processor
            //send the completion response
            //if error send the response
            var compressMode = false;

            if (dataArray.indexOf(";CompressMode=1;") != -1)
             compressMode = true;

            if(1 == agentConfReader.enable_cpu_profiling) {
                util.logger.info("Going to take CPU Profiling for 10 min .");
                v8_profiler.startCpuProfiling(clientSocket);
            }
            else
                util.logger.warn("Enable keyword 'enable_cpu_profiling=1' in file 'ndKeywordConfigurationFile' to start CPU Profiling ")
        }
        
        else if (action[1]="get_heap_dump;") {
            try {
                if(1 == agentConfReader.enable_heapdump) {
                    util.logger.info("Going to take Heap dump for 10 min .");
                    v8_profiler.takeHeapSnapShot(clientSocket);
                }
                else
                    util.logger.warn("Enable keyword 'enable_heapdump=1' in file 'ndKeywordConfigurationFile' to take Heap dump ")
            }
            catch (e) {
                clientSocket.write("nd_meta_data_rep:action=get_heap_dump;result=Error:'<'Unable to take heapDump Because Of Exception.Check BCI error log for detail.>;\n");
            }
        }

      }

      if(dataArray[0] == "nd_control_req")
      {
          var messageArray = dataArray[1].split(";");

          var action = messageArray[0].split("=");


          if(action[1] == "start_instrumentation") {

              agentConfReader.isToInstrument = true;
             // agentConfReader.btrecordMap = new Object();

              try {
                  for (var i = 0; i < messageArray.length; i++) {

                      var propertyValuePairs = messageArray[i].split("=");

                      if(propertyValuePairs[0] == "ndFlowpathMasks")
                      {
                          FP_Instances = propertyValuePairs[1].split("%20");
                          var instance_id_fromNDC = (FP_Instances[0]);
                          if(instance_id_fromNDC.length > 8)
                          {
                              var making_id = instance_id_fromNDC.split("x");
                              var msb = '0x'+making_id[1].substring(0,making_id[1].length/2);
                              var lsb = '0x'+making_id[1].substring(making_id[1].length/2,making_id[1].length);
                              agentConfReader.flowPathInstanceInitialID =new Long(lsb,msb).toString();
                          }
                          agentConfReader.timeStampMask = parseInt((FP_Instances[1]),16);
                          agentConfReader.seqNoDigits = parseInt((FP_Instances[2]),16);
                          agentConfReader.seqNumMask = parseInt((FP_Instances[3]),16);
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
              catch(err) {
                  util.logger.warn(err);
              }
          }


          //Control message for closing the connection
          else if(action[1] == "stop_instrumentation")
          {
              status = messageArray[1].split("=")[1];

              if(status == "stopping") {
                  if (agentConfReader.dataConnHandler && agentConfReader.dataConnHandler.client) {
                      agentConfReader.isToInstrument = false;

                      //creating control message
                      controlMessage = "nd_control_rep:action=stop_instrumentation;status=" + status + ";result=Ok;" + "\n" ;

                      agentConfReader.dataConnHandler.client.end();
                      agentConfReader.dataConnHandler.client.destroy();
                      agentConfReader.autoSensorConnHandler.client.end();
                      agentConfReader.autoSensorConnHandler.client.destroy();

                      util.logger.info("NDC is stopped : "+controlMessage);
                      clientSocket.write(controlMessage);               //Stopping the connection
                  }
              }
          }
      }
  });
};


module.exports = MessageHandler;