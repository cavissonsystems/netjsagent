/**
 * Created by Siddhant on 18-09-2015.
 */


var net = require('net');
var agent = require("./agent-setting");
var AutoMessageMessageHandler = require("./autoSensorMessage-handler");
var util =  require('./util');
var retrying=false;

function autoSensorConnHandler(){
    this.client=null;
    this.timeout=null;
    this.autoMsgHandler=null;
}

autoSensorConnHandler.prototype.createAutoSensorConn = function(){

    try {

        var self = this ;

        this.client  = new net.Socket();

        this.client.on('error', function(err)
        {
            try{
                if (!retrying) {
                    retrying=true;
                    self.connectToServer();
                }
                util.logger.warn("AutoSensor connection, Received error event- "+err);
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
                util.logger.warn("AutoSensor connection, Received end event on socket-  "+err);
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
                util.logger.warn("AutoSensor connection, Received socket close event-  "+err);
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
                self.autoMsgHandler = new AutoMessageMessageHandler(self);
            }catch(err){util.logger.warn(err);}
        });

        this.client.on("data", function (data) {
            console.log("data from ndc : " + data.toString());
        });


        this._connect();
    }
    catch(e){

    }
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
        this.timeout=null;
        this.autoMsgHandler=null;

}

autoSensorConnHandler.prototype._connect = function()
{
    if(!agent.isTestRunning)
        return;

    try {
        this.client.connect(agent.getPort(), agent.getNDCHost(), function () {});
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