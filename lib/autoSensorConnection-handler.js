/**
 * Created by Siddhant on 18-09-2015.
 */

var net = require('net');
var agent = require("./agent-setting");
var AutoMessageMessageHandler = require("./autoSensorMessage-handler");
var util =  require('./util');
var backlog = [];
var thisInstance= undefined;

function autoSensorConnHandler(){
    thisInstance=this;
    this.client=null;
    this.timeOut=null;
    this.autoMsgHandler=null;
    this.discardedFPLength =0;
    /*
     * Adding NDCHost & port in constructor, so if control connection is getting close during running test
     * then agent will switch over and will try to connect with backup NDC, but Data and Auto connection will connect with
     * previous NDC, untill control connection with new server has been made
     * */
    this.ndcHost=0 ;this.ndcPort=7892;
}

var closeConnListener = function(err) {
    var self=thisInstance;
    util.logger.warn(agent.currentTestRun + " | AutoSensor connection, Received socket close event with Host : " + self.ndcHost + " ,Port=" + self.ndcPort + ", Error :  " + err);
    self.connectToServer();
}

var connectConnListener = function() {
    try {
        //clearTimeout(self.timeOut);
        var self=thisInstance;
        self.timeOut=undefined;
        util.logger.info(agent.currentTestRun+" | AS Connection established with NDCollector : Socket[addr="+self.ndcHost+",port="+self.ndcPort + ",localport=" +this.localPort );
        self.autoMsgHandler = new AutoMessageMessageHandler(self);
        if( backlog.length ) {
            for(var i= 0, len= backlog.length; len>i; ++i)
                self.client.write(backlog[i]);

            backlog.length= 0;
        }
    }catch(err){util.logger.warn(agent.currentTestRun+" | "+err);}
}
autoSensorConnHandler.clearBuffer = function()
{
    backlog = [];
}
autoSensorConnHandler.prototype.createAutoSensorConn = function(server,currProto){

    try {
        var self = this ;
        self.ndcHost = server.ndcHost;              //Setting new Host port, at time of new Object [connection] creation
        self.ndcPort = currProto.port;

        this.client  = new net.Socket();

        this.client.on('error', function(err) {
            console.log('Error in au connection',err)
            console.log(err.stack)
        });

        this.client.on('end', function(err) {});

        this.client.on('close', closeConnListener);

        this.client.on('connect',connectConnListener);

        this._connect();
    }
    catch(e){
        util.logger.warn(agent.currentTestRun+" | "+e);
    }
};

autoSensorConnHandler.prototype.connectToServer = function()
{
    try {
        if (!agent.isTestRunning)
            return;

        var self = this;

        if (!self.client)
            return;
        /*if (self.client && self.client.writable)
            return;*/

        if (self.timeOut)
            return;

        this.timeOut = setTimeout(function () {
            try {
                self.timeOut = undefined;
                self._connect();
                util.logger.info(agent.currentTestRun + " | Timer for retrying Auto Sensor connectoion expired. trying to connect with Host : " + self.ndcHost + " ,Port=" + self.ndcPort);
            } catch (e) {
                util.logger.warn(agent.currentTestRun + " | " + e);
            }
        }, 60000);
    }
    catch(e){
        util.logger.warn(e);
    }
};

autoSensorConnHandler.prototype.closeConnection =function() {
    try {
        util.logger.info(agent.currentTestRun + " | Closing the Auto_sensor connection .");
        if (this.client != null) {
            this.client.removeAllListeners();

            this.client.destroy();
            delete this.client;
            this.client = undefined;
        }
        this.ndcHost = 0;
        this.ndcPort = 7892;
        this.timeOut = null;
        this.discardedFPLength = 0;
        delete this.autoMsgHandler
    }
    catch(e){
        util.logger.warn(e);
    }
}

autoSensorConnHandler.prototype._connect = function()
{
    var self=this;
    if(!agent.isTestRunning)
            return;

    if(!this.client)
        return;
    /*if(this.client.writable)
        return*/
    try {
        this.client.connect(self.ndcPort, self.ndcHost);
    }
    catch(err) {
        util.logger.warn(agent.currentTestRun+" | "+err);
    }
};

autoSensorConnHandler.prototype.write=function(data){
    try{

        if(!this.client || !data || !data.length)return
        if(this.client.bufferSize >= agent.ndASBufferSize) {
            if(this.discardedFPLength % 1000 === 0) {
                util.logger.warn(agent.currentTestRun + " | Discarding AutoSensor data, Buffer size : ", this.client.bufferSize, " is greater then ndASBufferSize");
                this.discardedFPLength = 0
            }
            ++this.discardedFPLength;
            return false
        }
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
        util.logger.warn(e);
    }

};

module.exports = autoSensorConnHandler;