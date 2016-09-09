
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

        this._connect();

        this.client.on('error', function(err) {
                /*if (!retrying) {
                    retrying=true;
                    self.connectToServer();
                }*/
                util.logger.warn(agent.currentTestRun+" | Data connection], Received error event with retrying : "+retrying+", - "+err);
        });

        this.client.on('end', function(err) {
                util.logger.warn(agent.currentTestRun+" | Data connection], Received end event with retrying : "+retrying+",  on socket-  "+err);
        });

        this.client.on('close', function(err) {
                util.logger.warn(agent.currentTestRun+" | Data connection], Received socket close event with retrying : "+retrying+", -  "+err);
        });

        this.client.on('connect', function() {
            try {
               /* retrying=false;
                if(self.timeOut) {
                    clearInterval(self.timeOut);
                }*/
                util.logger.info(agent.currentTestRun+" | Data connection created successfully with : "+agent.getPort() + "," + agent.getNDCHost());
                self.dataMsgHandler = new DataMessageHandler(self);
            }
            catch(e){
                util.logger.warn(agent.currentTestRun+" | "+e);
            }

        });

        this.client.on("data", function (data) {
            console.log("data from ndc : " + data.toString());
        });

    }catch(err){util.logger.warn("error" + err);}
};


dataConnHandler.prototype.connectToServer=function()
{
    if(!agent.isTestRunning) {
        util.logger.warn(agent.currentTestRun+" | Test run is not running .")
        return;
    }

    var self=this;
    self.timeOut = setInterval(function () {
        try {
            self._connect();
        }catch(e){util.logger.warn(agent.currentTestRun+" | "+e);}
    }, 60000);
}

dataConnHandler.prototype.closeConnection =function()
{
    util.logger.info(agent.currentTestRun+" | Closing the Data connection .");
    this.client.destroy();
    this.client=null;
    this.timeout=null;
    this.dataMsgHandler=null;
}

dataConnHandler.prototype._connect = function()
{
    if(!agent.isTestRunning) {
        util.logger.warn(agent.currentTestRun+" | Test is not running ,error in making data connection")
        return;
    }

    try {
        this.client.connect(agent.getPort(), agent.getNDCHost(), function () {});
    }
    catch(err) {
        util.logger.warn(err);
    }
};

dataConnHandler.prototype.write=function(data){
    try{
        if(agent.dataConnHandler)
            this.client.write(data)
    }
    catch(e){
        util.logger.warn(e);
    }

};

module.exports = dataConnHandler;