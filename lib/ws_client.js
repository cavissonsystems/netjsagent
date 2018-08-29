/**
 * Created by sahil on 18/02/18.
 */
const WebSocket = require('ws');
var MessageHandler = require('./controlmessage-handler');
var agentSetting = require("./agent-setting");
var serverConfig = require("./NDCServerConfig");
var util = require('./util');
var NDConnectionManager = require('./NDConnectionManager');

var socket_timeout;
var client ;
var controlMessageHandler;
var retryOnClose=0              // Counter that will store retry count for particular Server
var ndcHost=0;
var ndcPort=0;
var protocol;

function ws_client(){}

var closeConnListener = function(err) {
    try {
        agentSetting.isTestRunning = false;
        agentSetting.isToInstrument = false;
        clearInterval(agentSetting.reconnectTimer)          //Clearing reconnect timer interval
        agentSetting.reconnectTimer = undefined;
        util.logger.info(agentSetting.currentTestRun+" | Control connection, Received socket close event from Host : "
            ,ndcHost," ,Port : ",ndcPort," ,error : ", err);
        if(client) {
            client.removeAllListeners();
        }
        connectToServer()
    }
    catch(err){util.logger.warn(agentSetting.currentTestRun+" | Error in retrying for control connection with Host : "
        ,ndcHost," ,Port : ",ndcPort," ,error : ", err);}
}

function idleTimeOutCheck(){
    try{
        var self = this;
        self.setTimeout(60000);
        var idleTimeout = new Date().getTime();
        if(agentSetting.reconnectTimer == undefined){
            if(idleTimeout - agentSetting.lastHeartBeatReceived > agentSetting.ndcHeartBeatThreshold){
                util.logger.warn(agentSetting.currentTestRun + ' | Idle Socket Condition ,Hence Breaking the Connection in WS Connection')
                agentSetting.lastHeartBeatReceived = new Date().getTime();
                ws_client.destroy();
                NDConnectionManager.checkProtocolAndMakeConnection();
            }
        }
    }catch(e){
        util.logger.error(agentSetting.currentTestRun + ' | Error in IdleTimeOutCheck :',e)
    }
}

var connectConnListener = function() {
    try {
        var self = this;
        retryOnClose = 0                //After connecting , reseting value of reconnect for particular server to =0
        clearTimeout(socket_timeout);
        if(!controlMessageHandler) {
            controlMessageHandler = new MessageHandler(ws_client);
        }
        util.logger.info(agentSetting.currentTestRun+" | Connection established with NDCollector : Socket [addr="+ndcHost+" ,Port : "+ndcPort + " ,protocol : "+protocol+" ,localport :" +ws_client.getLocalPort() );
        controlMessageHandler.setClientSocket(ws_client)
        controlMessageHandler.handleMessages();
        controlMessageHandler.sendIntialMessages();             //Sending intial message i.e control connection
        serverConfig.updateLastConnInfo();
        if(self._socket){
            self._socket.setTimeout(60000)
            self._socket.on('timeout',idleTimeOutCheck)
        }else{
            util.logger.warn(agentSetting.currentTestRun + ' | web_socket._socket got Null ');
        }
    }
    catch(err){util.logger.warn(agentSetting.currentTestRun+" | connectConnListener error" , err);}
}


ws_client.connectToServer = function(){
    controlMessageHandler = undefined
    retryOnClose=0 , client= undefined;

    ws_client._connect();
};

function connectToServer()
{
    if(client.readyState === WebSocket.OPEN)
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
                    serverConfig.switchNDCMode()
                }
            }
            util.logger.info(agentSetting.currentTestRun+" | Timer for retrying control connectoion expired. trying to connect with Host : "+ndcHost+" ,Port : "+ndcPort,
                "Type : ",serverConfig.currentActiveServer.type);
            ws_client._connect();
        }
        catch(err){util.logger.warn(agentSetting.currentTestRun+" | Error in retrying" + err);}
    },serverConfig.sleepInterval);
}


ws_client._connect = function()
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
        else {
            var url = currProto.protocol+'://'+serverConfig.currentActiveServer.ndcHost+':'+currProto.port+'/' ;
            var options={}
            if(currProto.protocol.toLowerCase() == 'wss')
                options.rejectUnauthorized = false

            util.logger.info('0|Trying to Connect to ',url)
            client = new WebSocket(url,options);

            client.on('open',connectConnListener)
            client.on('close',closeConnListener )
            client.on('error', function(err) {});
            client.on('end', function(err) {});
        }
    }
    catch(err){
        util.logger.warn(agentSetting.currentTestRun+" | Error in making connection" + err);
    }

};

ws_client.destroy = function(){
    try{
        if(client) {
        /*
        * 1. We are removing close listener befor closing connection because is close listener we are retrying for connection .
        * 2. After closing connection , removing all liteners ,because in close's handshaking, server will send error, so agent should handle
        * exceptions*/
        agentSetting.isTestRunning = false;
        agentSetting.isToInstrument = false;

        clearInterval(agentSetting.reconnectTimer)          //Clearing reconnect timer interval
        agentSetting.reconnectTimer = undefined;
        if(client._socket)
                client._socket.removeListener('timeout',idleTimeOutCheck);
        client.removeListener('close',closeConnListener);
        client.removeListener('open',connectConnListener);
        client.close();
        //client.removeAllListeners();
        client= undefined
        }
    }catch(e){
        util.logger.error(agentSetting.currentTestRun + ' | Error in ws_client destroy()')
    }
}

ws_client.getLocalPort = function(){
    try {
        if (!client)return;
        return client._socket.address() ? client._socket.address().port : undefined
    }catch(err){util.logger.warn(err);}
}

ws_client.getLocalHost = function(){
    try {
        if (!client)return
        return client._socket.address() ? client._socket.address().address : undefined
    }catch(err){util.logger.warn(err);}
}

ws_client.getControlSocket = function(){
    return client;
}

ws_client.handleDataEvent = function(cb){
    client.on('message',cb)
}

ws_client.write = function(data){
    try {
        if (!client) {
            util.logger.error('Cant able to write, Not connected with NDC')
        }

        if (client.readyState === WebSocket.OPEN) {
            client.send(data)
        }
    } catch(err){
        util.logger.warn(agentSetting.currentTestRun+" | Error in writing over control channel" + err);
    }
}

module.exports = ws_client;
