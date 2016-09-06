/**
 * Created by Siddhant on 18-09-2015.
 */


var net = require('net');
var agent = require("./agent-setting");
var AutoMessageMessageHandler = require("./autoSensorMessage-handler");
var util =  require('./util');

function autoSensorConnHandler(){
    this.client=null;
    this.isClientConnected=false;
    this.timeout=null;
    this.autoMsgHandler=null;
}

autoSensorConnHandler.prototype.createAutoSensorConn = function(){

    this.connectToServer();
};

autoSensorConnHandler.prototype.connectToServer = function()
{
    if(!agent.isTestRunning)
        return;
    var self=this;
    this.timeOut = setInterval(function () {
        self._connect();
    }, 60000);
};

autoSensorConnHandler.prototype.closeConnection =function() {

        util.logger.info("Closing the Auto_sensor connection .");
        this.client.destroy();
        this.client=null;
        this.isClientConnected=false;
        this.timeout=null;
        this.autoMsgHandler=null;

}

autoSensorConnHandler.prototype._connect = function()
{
    if(!agent.isTestRunning)
        return;

    var self = this ;
    var currBCIClient = this;
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
                util.logger.warn("AutoSensor connection, Received error event- "+err);
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
                util.logger.warn("AutoSensor connection, Received end event on socket-  "+err);
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
                util.logger.warn("AutoSensor connection, Received socket close event-  "+err);
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
                self.autoMsgHandler = new AutoMessageMessageHandler(self);
            }catch(err){util.logger.warn(err);}
        });

        client.on("data", function (data) {
            console.log("data from ndc" + data.toString());
        });
    }
    catch(err) {
        util.logger.warn(err);
    }
};


autoSensorConnHandler.prototype.write=function(data){
    try{
        this.client.write(data)
    }
    catch(e){
        util.logger.warn(e);
    }

};

module.exports = autoSensorConnHandler;