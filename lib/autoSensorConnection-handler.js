/**
 * Created by Siddhant on 18-09-2015.
 */


var net = require('net');
var agent = require("./agent-setting");
var AutoMessageMessageHandler = require("./autoSensorMessage-handler");
var util =  require('./util');
var retrying=false;
var backlog = [];

function autoSensorConnHandler(){
    this.client=null;
    this.timeout=null;
    this.autoMsgHandler=null;
}

autoSensorConnHandler.prototype.createAutoSensorConn = function(){

    try {

        var self = this ;

        this.client  = new net.Socket();

        this.client.on('error', function(err) {
                //util.logger.warn(agent.currentTestRun+" | AutoSensor connection, Received error event with retrying : "+retrying+", - "+err);
        });

        this.client.on('end', function(err)
        {
//                util.logger.warn("AutoSensor connection, Received end event with retrying : "+retrying+",  on socket-  "+err);
        });

        this.client.on('close', function(err) {
                self.connectToServer();
                util.logger.warn(agent.currentTestRun+ " | AutoSensor connection, Received socket close event with retrying : "+retrying+", -  "+err);
        });

        this.client.on('connect', function() {
            try {
                clearTimeout(self.timeOut);

                if( backlog.length )
                {
                    for(var i= 0, len= backlog.length; len>i; ++i)
                        self.client.write(backlog[i]);

                    backlog.length= 0;
                }

                util.logger.info(agent.currentTestRun+" | AS Connection established with NDCollector : Socket[addr="+agent.getNDCHost()+",port="+agent.getPort() + ",localport=" +this.localPort );
                self.autoMsgHandler = new AutoMessageMessageHandler(self);
            }catch(err){util.logger.warn(agent.currentTestRun+" | "+err);}
        });

        this.client.on("data", function (data) {
           // console.log("data from ndc : " + data.toString());
        });

        this._connect();
    }
    catch(e){
        util.logger.warn(agent.currentTestRun+" | "+e);
    }
};

autoSensorConnHandler.prototype.connectToServer = function()
{
    if(!agent.isTestRunning)
        return;

    var self=this;

    if(self.client.writable)
        return;

    if(self.timeOut)
        return;

    var self=this;

    this.timeOut = setTimeout(function () {
        self._connect();
        self.timeout=0;
        util.logger.warn(agent.currentTestRun+" | Timer for retrying Auto Sensor connectoion expired. trying to connect...")
    }, 60000);
};

autoSensorConnHandler.prototype.closeConnection =function() {

    util.logger.info(agent.currentTestRun+" | Closing the Auto_sensor connection .");
    if(this.client != null)
        this.client.destroy();
    delete this.client;;
    delete this.autoMsgHandler
}

autoSensorConnHandler.prototype._connect = function()
{
    if(!agent.isTestRunning)
            return;

    if(this.client.writable)
        return;


    try {
        this.client.connect(agent.getPort(), agent.getNDCHost());
    }
    catch(err) {
        util.logger.warn(agent.currentTestRun+" | "+err);
    }
};

autoSensorConnHandler.prototype.write=function(data){
    try{

        if(this.client.writable) {
            this.client.write(data)
        }
        else
        {
            if(backlog.length <= 500 )
                backlog.push(data)
        }


        /* if(this.client == null)
         return ;

        if(agent.autoSensorConnHandler)
            this.client.write(data)
         */
    }
    catch(e){
        util.logger.warn(agent.currentTestRun+" | "+e);
    }

};

module.exports = autoSensorConnHandler;