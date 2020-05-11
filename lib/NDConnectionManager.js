/**
 * Created by Sahil on 3/13/18.
 * This file will manage control connection transformation between TCP and WS/WSS
 */

var serverConfig = require("./NDCServerConfig");
var dataConnectionHandler = require("./dataconnection-handler");
var tempDataConnectionHandler = require("./wsStreamConnection");
var ws_dataConnectionHandler = require("./wsDataConnection-handler");
var ws_AutoSensorConnectionHandler = require('./wsAutoSensorConnection-handler');
var AutoSensorConnectionHandler = require('./autoSensorConnection-handler');

var checkProtocolAndMakeConnection = function(){
    var serverConfig = require("./NDCServerConfig");
    var currProto = serverConfig.getCurrentActiveProtocol();
    if(!currProto || currProto.protocol.toLowerCase() == 'tcp'){
        return require('./client').connectToServer()
    }
    else {
        return require('./ws_client').connectToServer()
    }
}

var makeDataConnection = function(currProto){
    var serverConfig = require("./NDCServerConfig");
    var currObj =currProto.protocol.toLowerCase()  == 'tcp' ? new dataConnectionHandler() : new ws_dataConnectionHandler();
    currObj.createDataConn(serverConfig.currentActiveServer,false,currProto);
    return currObj;
}

var makeAutoConection = function(currProto){
    var serverConfig = require("./NDCServerConfig");
    var currObj = currProto.protocol.toLowerCase()  == 'tcp' ? new AutoSensorConnectionHandler() : new ws_AutoSensorConnectionHandler();
    currObj.createAutoSensorConn(serverConfig.currentActiveServer,currProto);
    return currObj;
}

var makeTemporaryWsDataConnection = function(currProto){
    return currProto.protocol.toLowerCase()  == 'tcp' ? new dataConnectionHandler() : new tempDataConnectionHandler()
}

module.exports = {
        checkProtocolAndMakeConnection : checkProtocolAndMakeConnection,
        makeDataConnection : makeDataConnection,
        makeAutoConection : makeAutoConection,
        makeTemporaryWsDataConnection : makeTemporaryWsDataConnection
}