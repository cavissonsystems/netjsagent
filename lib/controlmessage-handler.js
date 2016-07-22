/**
 * Created by bala on 23/7/15.
 */

var agentConfReader = require("./agent-setting");
var flowpathHandler = require("./flowpath-handler");
var DataConnectionHandler = require("./dataconnection-handler");
var AutoSensorConnectionHandler = require('./autoSensorConnection-handler');
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
          //nd_control_req:action=stop_instrumentation;status=stopping;ndAppServerHost=Mew;ndlPort=0;ndAgentPort=0;ndCollectorIP=127.0.0.1;ndCollectorPort=7892;
          if(action[1] == "stop_instrumentation")
          {
              status = messageArray[1].split("=")[1];

              if(status == "stopping") {
                  if (agentConfReader.dataConnHandler && agentConfReader.dataConnHandler.client) {
                      agentConfReader.isToInstrument = false;

                      controlMessage = "nd_control_rep:action=stop_instrumentation;status=" + status + ";result=Ok;" + "\n" ;

                      agentConfReader.dataConnHandler.client.end();
                      agentConfReader.dataConnHandler.client.destroy();
                      agentConfReader.autoSensorConnHandler.client.end();
                      agentConfReader.autoSensorConnHandler.client.destroy();

                      util.logger.info("NDC is stopped : "+controlMessage);
                      clientSocket.write(controlMessage);
                  }
              }
          }
      }
  });
};


module.exports = MessageHandler;