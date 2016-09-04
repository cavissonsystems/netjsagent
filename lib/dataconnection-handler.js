
var net = require('net');
var dataConn;
var isToInstrument = false;
var isClientConnected = false;
var agentConfReader = require("./agent-setting");
var DataMessageHandler = require("./datamessage-handler");
var util = require('./util');


function dataConnHandler(){

}

dataConnHandler.prototype.createDataConn = function(){

    this.client = null;
    this._createServer();
    return this;
};



dataConnHandler.prototype._createServer = function()
{
    var client = new net.Socket();
    this.client = client;

    try {

        client.connect(agentConfReader.getPort(), agentConfReader.getNDCHost(), function () {

        });
        client.on('error', function(err)
        {
            util.logger.warn("retry");
        });

        client.on('connect', function() {
           new DataMessageHandler(this);

        });
    }
    catch(err) {
        util.logger.warn(err);
    }
};

module.exports = dataConnHandler;