
var net = require('net');
var isToInstrument = false;

var agent = require("./agent-setting");
var DataMessageHandler = require("./datamessage-handler");
var util = require('./util');

function dataConnHandler(){
    this.client=null;
    this.isClientConnected=false;
    this.timeout=null;
    this.dataMsgHandler=null;
}

dataConnHandler.prototype.createDataConn = function(){

    this.connectToServer();
};


dataConnHandler.prototype.connectToServer=function()
{
    if(!agent.isTestRunning)
        return;
    var self=this;
    this.timeOut = setInterval(function () {
        self._connect();
    }, 60000);
}

dataConnHandler.prototype.closeConnection =function()
{
    util.logger.info("Closing the Data connection .");
    this.client.destroy();
    this.client=null;
    this.isClientConnected=false;
    this.timeout=null;
    this.dataMsgHandler=null;


}

dataConnHandler.prototype._connect = function()
{
    if(!agent.isTestRunning)
        return;
    var self = this;
    var client = new net.Socket();
    this.client = client;

    try {

        client.on('error', function(err)
        {
            try{
                if(self.isClientConnected){
                    self.connectToServer();
                }
                self.isClientConnected = false;
                util.logger.warn("Data connection], Received error event- "+err);
            }
            catch(e){
                util.logger.warn(e);
            }
        });

        client.on('end', function(err)
        {
            try{
                if(self.isClientConnected){
                    self.connectToServer();
                }
                self.isClientConnected = false;
                util.logger.warn("Data connection], Received end event on socket-  "+err);
            }
            catch(e){
                util.logger.warn(e);
            }
        });

        client.on('close', function(err)
        {
            try{
                if(self.isClientConnected){
                    self.connectToServer();
                }
                self.isClientConnected = false;
                util.logger.warn("Data connection], Received socket close event-  "+err);
                self.connectToServer();
            }
            catch(e){
                util.logger.warn(e);
            }

        });


        client.connect(agent.getPort(), agent.getNDCHost(), function () {

        });

        client.on('connect', function() {
            try {
                self.isClientConnected = true;
                clearInterval(self.timeOut);
                self.dataMsgHandler = new DataMessageHandler(self);
            }
            catch(e){
                util.logger.warn(e);
            }

        });

        client.on("data", function (data) {
            console.log("data from ndc" + data.toString());
        });
    }
    catch(err) {
        util.logger.warn(err);
    }
};

dataConnHandler.prototype.write=function(data){
    try{
        this.client.write(data)
    }
    catch(e){
        util.logger.warn(e);
    }

};

module.exports = dataConnHandler;