/**
 * Created by bala on 10/7/15.
 */
var net = require('net');
var MessageHandler = require('./controlmessage-handler');
var agentSetting = require("./agent-setting");
var util = require('./util');

var clientConn;
var retrying=false;
var socket_timeout;
var client ;
var controlMessageHandler;

function clientConn()
{

}

function closeDataAutoConnections(){
    if (agentSetting.dataConnHandler) {           //Checking is dataConnHandler
        agentSetting.dataConnHandler.closeConnection();
        delete agentSetting.dataConnHandler;
    }
    if(agentSetting.autoSensorConnHandler){             //Checking is autoSensorConn
        agentSetting.autoSensorConnHandler.closeConnection();
        delete agentSetting.autoSensorConnHandler;
    }
}

clientConn.connectToServer = function(){

    try {
        clientConn = this;

        client = new net.Socket();

        client.on('error', function(err) {
     //           util.logger.error(agentSetting.currentTestRun+" | Control connection, Received error event with retrying : "+retrying+", - " + err);
              });

        client.on('end', function(err) {
       //         util.logger.error(agentSetting.currentTestRun+" | Control connection, Received end event with retrying : "+retrying+", on socket-  " + err);
        });

        client.on('close', function(err) {
            try {
                agentSetting.isTestRunning = false;
                agentSetting.isToInstrument = false;
                closeDataAutoConnections()                      //Cleaning all connection
                util.logger.info(agentSetting.currentTestRun+" | Control connection, Received socket close event from Host : "
                    ,agentSetting.getNDCHost()," ,Port : ",agentSetting.getPort(),' ,error : ', err);
                connectToServer();
            }
            catch(err){util.logger.warn(agentSetting.currentTestRun+" | Error in retrying for control connection with Host : "
                ,agentSetting.getNDCHost()," ,Port : ",agentSetting.getPort(),' ,error : ', err);}
        });

        client.on('connect', function() {
            try {
                clearTimeout(socket_timeout);

                if(!controlMessageHandler) {
                    controlMessageHandler = new MessageHandler(this);
                }
                util.logger.info(agentSetting.currentTestRun+" | Connection established with NDCollector : Socket[addr="+agentSetting.getNDCHost()+" ,Port : "+agentSetting.getPort() + " ,localport" +this.localPort );
                controlMessageHandler.setClientSocket(this)
                controlMessageHandler.sendIntialMessages();
            }
            catch(err){util.logger.warn(agentSetting.currentTestRun+" | error" , err);}
        });

            clientConn._connect();
    }
    catch(err){util.logger.warn("error" , err);}
};


function connectToServer()
{
    if(client.writable)
        return;

    if(socket_timeout)
        return;

    agentSetting.checkNDSettingFile(agentSetting.ndSettingFile);

    socket_timeout = setTimeout(function () {
        try {
            socket_timeout=0;
            clientConn._connect();

            util.logger.warn(agentSetting.currentTestRun+" | Timer for retrying control connectoion expired. trying to connect with Host : "+agentSetting.getNDCHost()+" ,Port : "+agentSetting.getPort());
        }
        catch(err){util.logger.warn(agentSetting.currentTestRun+" | Error in retrying" + err);}
    }, 60000);
}


clientConn._connect = function()
{
    try{
        if((agentSetting.ndcHost == undefined) || (agentSetting.ndcPort == undefined))
            connectToServer();
        else
            client.connect(agentSetting.getPort(), agentSetting.getNDCHost())


    }
    catch(err){
        util.logger.warn(agentSetting.currentTestRun+" | Error in making connection" + err);
    }

};


module.exports = clientConn;

