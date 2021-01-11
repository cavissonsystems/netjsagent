
var net = require('net');
var isToInstrument = false;

var agent = require("./agent-setting");
var DataMessageHandler = require("./datamessage-handler");
var util = require('./util');

var retrying=false;
var backlog = [];
var thisInstance= undefined;

function dataConnHandler(istempConn){       //tempConn : Boolean Flag representing that Connection is Temporary Connection
    thisInstance= this;
    this.client=null;
    this.timeout=null;
    this.dataMsgHandler=null;
    this.discardedFPLength = 0;
    this.istempDataConn = false;
    this.client = istempConn ? (new net.Socket({highWaterMark:1024*1024*15})) : new net.Socket();
    /* *
    * Adding NDCHost & port in constructor, so if control connection is getting close during running test
    * then agent will switch over and will try to connect with backup NDC, but Data and Auto connection will connect with
    * previous NDC, untill control connection with new server has been made
    * */
    this.ndcHost=0 ;this.ndcPort=7892;
}

var closeConnListener =function(err) {
    var self =thisInstance
    util.logger.warn(agent.currentTestRun+" | Data connection, Received socket close event from Host : "+self.ndcHost+" ,Port="+self.ndcPort +", Error :  "+err);
    if(self.istempDataConn) {
        self.closeConnection();
    }
    else{
        self.connectToServer();
    }
}

var connectConnListener = function() {
    try {
        var self =thisInstance
        //clearTimeout(self.timeout);
        self.timeout = undefined;
        if(!self.istempDataConn && self.client){    // if Temporary Connection is True , Then Dont send Data Connection Message
            util.logger.info(agent.currentTestRun+" | Data Connection established with NDCollector : Socket[addr="+self.ndcHost+",port="+self.ndcPort + ",localport=" +this.localPort );
            self.dataMsgHandler = new DataMessageHandler(self);
            if( backlog.length )
            {
                for(var i= 0, len= backlog.length; len>i; ++i)
                    self.client.write(backlog[i]);

                backlog.length= 0;
            }
        }
    }
    catch(e){
        util.logger.warn(e);
    }
}

dataConnHandler.prototype.createDataConn = function(server,istempDataConn,currProto,cbForHeapDump){
    try {
        this.ndcHost = server.ndcHost;              //Setting new Host port, at time of new Object [connection] creation
        this.ndcPort = currProto.port;
        this.istempDataConn = istempDataConn;       //Flag for New Data Connection.
        var self = this;
        // this.client = new net.Socket();
        this.client.on('error', function(err) {
               // util.logger.warn(agent.currentTestRun+" | Data connection], Received error event with retrying :  ",err);
        });
/*
        this.client.on('end', function(err) {
                //util.logger.warn(agent.currentTestRun+" | Data connection], Received end event with retrying : "+retrying+",  on socket-  "+err);
        });*/

        this.client.on('close',closeConnListener);

        this.client.on('connect',connectConnListener);
        if(cbForHeapDump)this.client.on('connect',cbForHeapDump);

        /*this.client.on("data", function (data) {
          //  console.log("data from ndc : " + data.toString());
        });*/

        this._connect();

    }catch(err){util.logger.warn(err);}
};


dataConnHandler.prototype.connectToServer=function()
{
    try {
        if (!agent.isTestRunning) {
            util.logger.warn(agent.currentTestRun + " | Test run is not running .")
            return;
        }
        var self = this;

        if (!this.client)
            return;

        /*if (self.client && self.client.writable)
            return;*/

        if (self.timeout)
            return;

        self.timeout = setTimeout(function () {
            try {
                self.timeout = undefined;
                self._connect();
                util.logger.warn(agent.currentTestRun + " | Timer for retrying Data connectoion expired. trying to connect with Host : " + self.ndcHost + " ,Port=" + self.ndcPort);
            } catch (e) {
                util.logger.warn(e);
            }
        }, 60000);
    }
    catch(e){
            util.logger.warn(e);
    }
}


dataConnHandler.prototype.closeConnection =function()
{
    try {
        util.logger.info(agent.currentTestRun + " | Closing the New Data connection .");
        if (this.client) {
            this.client.removeListener('close', closeConnListener);
            this.client.removeListener('connect', connectConnListener);
            this.client.destroy();
            delete this.client;
            this.client = undefined;
        }
        this.ndcHost = 0;
        this.ndcPort = 7892;
        this.timeout = null;
        this.istempDataConn = false;
        this.discardedFPLength = 0;
        delete this.dataMsgHandler;
    }
    catch(e){
        util.logger.warn(e);
    }
}

dataConnHandler.prototype._connect = function()
{
    var self = this;
    if(!agent.isTestRunning && !self.istempDataConn) {
        util.logger.warn(agent.currentTestRun+" | Test is not running ,error in making data connection")
        return;
    }
    if(!this.client)
        return;

    /*if(this.client.writable)
        return*/
    try {
        this.client.connect(self.ndcPort, self.ndcHost);
    }
    catch(err) {
        util.logger.warn(err);
    }
};

dataConnHandler.prototype.write=function(data){
    try {
        if(!this.client ||!data || !data.length)return
	    if(this.client.writable) {
            if(!this.istempDataConn) {
                if (this.client.bufferSize >= agent.ndDataBufferSize) {
                    if (this.discardedFPLength % 1000 === 0) {
                        util.logger.warn(agent.currentTestRun + " | Discarding Data conn data, Buffer size : ", this.client.bufferSize, " is greater then ndDataBufferSize");
                        this.discardedFPLength = 0
                    }
                    ++this.discardedFPLength;
                    return false
                }
            }
        }
        if (this.client == undefined) {
            if (backlog.length <= 500)
                backlog.push(data);

            return
            util.logger.warn(agent.currentTestRun+"| client undefined ...........")
        }

        this.client.write(data);
    }
    catch(e){
        util.logger.warn(e);
    }

};

dataConnHandler.prototype.getSocket=function(){
    return this.client;
}

module.exports = dataConnHandler;
