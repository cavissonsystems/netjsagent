var WebSocket = require('ws');
var agent = require("./agent-setting");
var AutoMessageMessageHandler = require("./autoSensorMessage-handler");
var util =  require('./util');
var retrying=false;
var backlog = [];
var thisInstance= undefined;


function autoSensorConnHandler(){
    thisInstance=this;
    this.client=null;
    this.timeOut=null;
    this.autoMsgHandler=null;
    this.discardedFPLength =0;
    this.protocol;
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
    if(this.client) {
        this.client.removeAllListeners();
    }
    self.connectToServer();
}

var connectConnListener = function() {
    try {
        var self=thisInstance;
        self.timeOut=undefined;
        util.logger.info(agent.currentTestRun+" | AS Connection established with NDCollector : Socket[addr="+self.ndcHost+",port="+self.ndcPort + ",localport=" +self.getLocalPort() );
        self.autoMsgHandler = new AutoMessageMessageHandler(self);
        if( backlog.length ) {
            for(var i= 0, len= backlog.length; len>i; ++i)
                self.client.send(backlog[i]);

            backlog.length= 0;
        }
    }catch(err){util.logger.warn(agent.currentTestRun+" | Error occured in connectConnListener function : "+err);}
}

autoSensorConnHandler.prototype.getLocalPort = function(){
    try {
        if (!this.client)return;
        return this.client._socket.address() ? this.client._socket.address().port : undefined;
    } catch(err){util.logger.warn(err);}
}

autoSensorConnHandler.prototype.createAutoSensorConn = function(server,currProto){

    try {
        var self = this ;
        self.ndcHost = server.ndcHost;              //Setting new Host port, at time of new Object [connection] creation
        self.ndcPort = currProto.port;
        this.protocol = currProto.protocol
        this._connect();
    }
    catch(e){
        util.logger.warn(agent.currentTestRun+" | Error occured in createAutoSensorConn function : "+e);
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
        /*
         * 1. We are removing close listener befor closing connection because is close listener we are retrying for connection .
         * 2. After closing connection , removing all liteners ,because in close's handshaking, server will send error, so agent should handle
         * exceptions*/
        util.logger.info(agent.currentTestRun + " | Closing the Auto_sensor connection .");
        if (this.client != null) {
            this.client.removeListener('close',closeConnListener)
            this.client.close();
            this.client.removeAllListeners();

            delete this.client;
            this.client = undefined;
        }
        this.ndcHost = 0;
        this.ndcPort = 7892;
        clearTimeout(this.timeOut)                  //If connection is closed forcefully , and timeout is running, then it will make another connection , because timeout=null will not stop the setTimeout loop
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
    if(!agent.isTestRunning) {
        return;
    }
    try {
        var url = this.protocol+'://'+self.ndcHost+':'+self.ndcPort+'/' ;
        var options={}
        if(this.protocol.toLowerCase() == 'wss')
            options.rejectUnauthaurized = false
        this.client = new WebSocket(url,options);

        this.client.on('error', function(err) {});
        this.client.on('close', closeConnListener);
        this.client.on('open',connectConnListener);
    }
    catch(err) {
        util.logger.warn(agent.currentTestRun+" | Error occured in _connect function : "+err);
    }
};

autoSensorConnHandler.prototype.write=function(data){
    try{
        if(!this.client || !data || !data.length)return
        if(this.client.bufferedAmount >= agent.ndASBufferSize) {
            if(this.discardedFPLength % 1000 === 0) {
                util.logger.warn(agent.currentTestRun + " | Discarding AutoSensor data, Buffer size : ", this.client.bufferSize, " is greater then ndASBufferSize");
                this.discardedFPLength = 0
            }
            ++this.discardedFPLength;
            return false
        }
        //if(this.client.writable) {
        if(this.client.readyState === WebSocket.OPEN){
            this.client.send(data)
        }
        else {
            if(backlog.length <= 500 )
                backlog.push(data)
        }
    }
    catch(e){
        util.logger.warn(e);
    }
};

module.exports = autoSensorConnHandler;
