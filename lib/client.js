/**
 * Created by bala on 10/7/15.
 */
var net = require('net');
var MessageHandler = require('./controlmessage-handler');
var agentSetting = require("./agent-setting");
var serverConfig = require("./NDCServerConfig");
var util = require('./util');

var socket_timeout;
var client ;
var controlMessageHandler;
var retryOnClose=0              // Counter that will store retry count for particular Server
var ndcHost=0;
var ndcPort=0;
var protocol;

function clientConn() {}

var closeConnListener = function(err) {
    try {
        agentSetting.isTestRunning = false;
        agentSetting.isToInstrument = false;
        util.logger.info(agentSetting.currentTestRun+" | Control connection, Received socket close event from Host : "
            ,ndcHost," ,Port : ",ndcPort," ,error : ", err);
        /*if(serverConfig.currentActiveServer.connectWithoutWait){
         serverConfig.currentActiveServer.connectWithoutWait = false;
         clientConn._connect();
         }
         else*/
        connectToServer();
    }
    catch(err){util.logger.warn(agentSetting.currentTestRun+" | Error in retrying for control connection with Host : "
        ,ndcHost," ,Port : ",ndcPort," ,error : ", err);}
}

var connectConnListener = function() {
    try {
        retryOnClose = 0                //After connecting , reseting value of reconnect for particular server to =0

        clearTimeout(socket_timeout);
        if(!controlMessageHandler) {
            controlMessageHandler = new MessageHandler(clientConn);
            controlMessageHandler.handleMessages();
        }
        util.logger.info(agentSetting.currentTestRun+" | Connection established with NDCollector : Socket[addr="+ndcHost+" ,Port : "+ndcPort + " ,Protocol : "+protocol+" ,localport :" +this.localPort );
        controlMessageHandler.setClientSocket(clientConn)
        controlMessageHandler.sendIntialMessages();             //Sending intial message i.e control connection
    }
    catch(err){util.logger.warn(agentSetting.currentTestRun+" | error" , err);}
}
clientConn.connectToServer = function(){

    try {
        controlMessageHandler = undefined
        retryOnClose=0
        client = new net.Socket();

        client.on('error', function(err) {});

        client.on('end', function(err) {});

        client.on('close',closeConnListener )

        client.on('connect',connectConnListener)

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

    agentSetting.readSettingFile()
    if(!serverConfig.currentActiveServer)           // First time current server refrence is null , so pointing it to 0th index of server list
        serverConfig.currentActiveServer = serverConfig.serverList[0] ?  serverConfig.serverList[0] : serverConfig.defaultServer;

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
            util.logger.info(agentSetting.currentTestRun+" | Timer for retrying control connectoion expired. trying to connect with Host : "+ndcHost+" ,Port : "+ndcPort,
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
            serverConfig.currentActiveServer = serverConfig.serverList[0] ?  serverConfig.serverList[0] : serverConfig.defaultServer;

        var currProto = serverConfig.getCurrentActiveProtocol()
        ndcHost = serverConfig.currentActiveServer.ndcHost;
        ndcPort = currProto.port;
        protocol = currProto.protocol;

        if((serverConfig.currentActiveServer.ndcHost == undefined) || (currProto.port == undefined))
            connectToServer();
        else
            client.connect(currProto.port,serverConfig.currentActiveServer.ndcHost)
    }
    catch(err){
        util.logger.warn(agentSetting.currentTestRun+" | Error in making connection" + err);
    }

};

clientConn.destroy = function(){
    try {
        if (client) {
            client.removeAllListeners();
            client.destroy();
            client.end();
        }
    }
    catch(err){
        util.logger.warn(agentSetting.currentTestRun+" | Error in Destroying the connection" + err);
    }
}

clientConn.getLocalHost = function(){
    if(!client)return
    return client.localAddress
}

clientConn.getControlSocket = function(){
    return client;
}

clientConn.handleDataEvent = function(cb){
    client.on('data',cb)
}
clientConn.write = function(data){
    try {
        if (!client || !data) {
            util.logger.error('Cant able to write, Not connected with NDC')
            return;
        }

        client.write(data)

    } catch(err){
        util.logger.warn(agentSetting.currentTestRun+" | Error in writing over connection" + err);
    }
}

module.exports = clientConn;
