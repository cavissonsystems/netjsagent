
var net = require('net');
var isToInstrument = false;

var agent = require("./agent-setting");
var DataMessageHandler = require("./datamessage-handler");
var util = require('./util');

var retrying=false;

function dataConnHandler(){
    this.client=null;
    this.timeout=null;
    this.dataMsgHandler=null;
}

dataConnHandler.prototype.createDataConn = function(){
    try {

        var self = this;
        this.client = new net.Socket();

        this.client.on('error', function(err)
        {
            try{
                if (!retrying) {
                    retrying=true;
                    self.connectToServer();
                }
                util.logger.warn("Data connection], Received error event- "+err);
            }
            catch(e){
                util.logger.warn(e);
            }
        });

        this.client.on('end', function(err)
        {
            try{
                if (!retrying) {
                    retrying=true;
                    self.connectToServer();
                }
                util.logger.warn("Data connection], Received end event on socket-  "+err);
            }
            catch(e){
                util.logger.warn(e);
            }
        });

        this.client.on('close', function(err)
        {
            try{
                if (!retrying) {
                    retrying=true;
                    self.connectToServer();
                }
                util.logger.warn("Data connection], Received socket close event-  "+err);
            }
            catch(e){
                util.logger.warn(e);
            }

        });

        this.client.on('connect', function() {
            try {
                retrying=false;
                if(self.timeOut)
                    clearInterval(self.timeOut);
                self.dataMsgHandler = new DataMessageHandler(self);
            }
            catch(e){
                util.logger.warn(e);
            }

        });

        this.client.on("data", function (data) {
            console.log("data from ndc : " + data.toString());
        });

        this._connect();

    }catch(err){util.logger.warn("error" + err);}
};


dataConnHandler.prototype.connectToServer=function()
{
    if(!agent.isTestRunning)
        return;

    var self=this;
    self.timeOut = setInterval(function () {
        try {
            self._connect();
        }catch(err){util.logger.warn("error" + err);}
    }, 60000);
}

dataConnHandler.prototype.closeConnection =function()
{
    util.logger.info("Closing the Data connection .");
    this.client.destroy();
    this.client=null;
    this.timeout=null;
    this.dataMsgHandler=null;
}

dataConnHandler.prototype._connect = function()
{
    if(!agent.isTestRunning)
        return;

    try {

        this.client.connect(agent.getPort(), agent.getNDCHost(), function () {

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