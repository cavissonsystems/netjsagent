/**
 * Created by bala on 10/7/15.
 */
var net = require('net');
var MessageHandler = require('./controlmessage-handler');
var agentSetting = require("./agent-setting");
var serverConfig = require("./NDCServerConfig");
var util = require('./util');

var clientConn;
var retrying=false;
var socket_timeout;
var client ;
var controlMessageHandler;
var retryOnClose=0              // Counter that will store retry count for particular Server

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
                //closeDataAutoConnections()                      //Cleaning all connection
                clearInterval(agentSetting.reconnectTimer)          //Clearing reconnect timer interval
                agentSetting.reconnectTimer = undefined;
                util.logger.info(agentSetting.currentTestRun+" | Control connection, Received socket close event from Host : "
                    ,serverConfig.currentActiveServer.ndcHost," ,Port : ",serverConfig.currentActiveServer.ndcPort,' ,error : ', err);
                connectToServer();
            }
            catch(err){util.logger.warn(agentSetting.currentTestRun+" | Error in retrying for control connection with Host : "
                ,serverConfig.currentActiveServer.ndcHost," ,Port : ",serverConfig.currentActiveServer.ndcPort,' ,error : ', err);}
        });

        client.on('connect', function() {
            try {
                retryOnClose = 0                //After connecting , reseting value of reconnect for particular server to =0

                clearTimeout(socket_timeout);
                if(!controlMessageHandler) {
                    controlMessageHandler = new MessageHandler(this);
                }
                util.logger.info(agentSetting.currentTestRun+" | Connection established with NDCollector : Socket[addr="+serverConfig.currentActiveServer.ndcHost+" ,Port : "+serverConfig.currentActiveServer.ndcPort + " ,localport" +this.localPort );
                controlMessageHandler.setClientSocket(this)
                controlMessageHandler.sendIntialMessages();             //Sending intial message i.e control connection
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

    //Invoking retry timer, to connect again with NDC
    socket_timeout = setTimeout(function () {
        try {
            socket_timeout = 0;
            if (serverConfig.serverList.length > 1) {
                if (retryOnClose >= serverConfig.retryCount) {                //Switich current server, if retrying is greater then retry count
                    retryOnClose = 0;
                    serverConfig.getNextBackupServer();

                    serverConfig.isSwitchOver = 1
                }
            }
            util.logger.info(agentSetting.currentTestRun+" | Timer for retrying control connectoion expired. trying to connect with Host : "+serverConfig.currentActiveServer.ndcHost+" ,Port : "+serverConfig.currentActiveServer.ndcPort,
            "Type : ",serverConfig.currentActiveServer.type);
            clientConn._connect();
        }
        catch(err){util.logger.warn(agentSetting.currentTestRun+" | Error in retrying" + err);}
    },serverConfig.sleepInterval);
}


clientConn._connect = function()
{
    try{
        ++retryOnClose
        if(!serverConfig.currentActiveServer)           // First time current server refrence is null , so pointing it to 0th index of server list
            serverConfig.currentActiveServer =  serverConfig.serverList[0];

        if((serverConfig.currentActiveServer.ndcHost == undefined) || (serverConfig.currentActiveServer.ndcPort == undefined))
            connectToServer();
        else
            client.connect(serverConfig.currentActiveServer.ndcPort,serverConfig.currentActiveServer.ndcHost)
    }
    catch(err){
        util.logger.warn(agentSetting.currentTestRun+" | Error in making connection" + err);
    }

};


module.exports = clientConn;

