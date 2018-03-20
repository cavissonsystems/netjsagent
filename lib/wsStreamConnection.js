/**
 * Created by compass341 on 2/28/2018.
 */

var WebSocket = require('ws');
var agent = require("./agent-setting");
var DataMessageHandler = require("./datamessage-handler");
var util = require('./util');
var websocket = require('websocket-stream')

var backlog = [];
var thisInstance= undefined;

function dataConnHandler(){
    thisInstance= this;
    this.client=null;
    this.timeout=null;
    this.dataMsgHandler=null;
    this.discardedFPLength = 0;
    this.istempDataConn = false;
    this.protocol
    /*
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
    /*else{
        if(this.client) {
            self.client.removeListener('close', closeConnListener);
            self.client.removeListener('open', connectConnListener);
        }
        self.connectToServer();
    }*/
}

var connectConnListener = function() {
    try {
        var self =thisInstance
        self.timeout = undefined;
        if(!self.istempDataConn){
            util.logger.info(agent.currentTestRun+" | Data Connection established with NDCollector : Socket[addr="+self.ndcHost+",port="+self.ndcPort + ",localport=" +this.localPort );
            self.dataMsgHandler = new DataMessageHandler(self);
            if( backlog.length ) {
                for(var i= 0, len= backlog.length; len>i; ++i)
                    self.client.send(backlog[i]);

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
        this.protocol = currProto.protocol
        var self = this;
        this._connect(cbForHeapDump);
    }catch(err){util.logger.warn(agent.currentTestRun + " | Error in connect in temp data connection ",err);}
};


dataConnHandler.prototype.connectToServer=function() {
    try {
        if (!agent.isTestRunning) {
            util.logger.warn(agent.currentTestRun + " | Test run is not running .")
            return;
        }
        var self = this;
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


dataConnHandler.prototype.closeConnection =function() {
    try {
        /*
         * 1. We are removing close listener befor closing connection because is close listener we are retrying for connection .
         * 2. After closing connection , removing all liteners ,because in close's handshaking, server will send error, so agent should handle
         * exceptions*/
        util.logger.info(agent.currentTestRun + " | Closing the New Data connection .");
        if (this.client) {
            this.client.socket.removeListener('close',closeConnListener)
            this.client.socket.close();
            this.client.socket.removeAllListeners()
            this.client.destroy()
            this.client.end()
            delete this.client;
            this.client = undefined;
        }
        this.ndcHost = 0;
        this.ndcPort = 7892;
        clearTimeout(this.timeout)
        this.timeout = null;
        this.istempDataConn = false;
        this.discardedFPLength = 0;
        delete this.dataMsgHandler;
    }
    catch(e){
        util.logger.warn(e);
    }
}

dataConnHandler.prototype._connect = function(cbForHeapDump) {
    var self = this;
    if(!agent.isTestRunning && !self.istempDataConn) {
        util.logger.warn(agent.currentTestRun+" | Test is not running ,error in making data connection")
        return;
    }
    try {
        var url = this.protocol+'://'+self.ndcHost+':'+self.ndcPort+'/';
        var options={}
        if(this.protocol.toLowerCase() == 'wss')
            options.rejectUnauthaurized = false
        this.client = websocket(url,options);

        this.client.socket.on('error', function(err) {});
        this.client.socket.on('end', function(err) {});
        this.client.socket.on('close',closeConnListener);
        if(cbForHeapDump) this.client.socket.on('open',cbForHeapDump);
    }
    catch(err) {
        util.logger.warn(agent.currentTestRun+" | Error in making data connection",err);
    }
};

dataConnHandler.prototype.write=function(data){
    try {
        if(!this.client ||!data || !data.length)return
        if(this.client.socket.readyState === WebSocket.OPEN) {
            if(!this.istempDataConn) {
                if (this.client.socket.bufferedAmount >= agent.ndDataBufferSize) {
                    if (this.discardedFPLength % 1000 === 0) {
                        util.logger.warn(agent.currentTestRun + " | Discarding Data conn data, Buffer size : ", this.client.bufferSize, " is greater then ndDataBufferSize");
                        this.discardedFPLength = 0
                    }
                    ++this.discardedFPLength;
                    return false
                }
            }
            this.client.socket.send(data);
        }
        else{
            if (backlog.length <= 500)
                backlog.push(data);

            util.logger.warn(agent.currentTestRun+"| client not connected ...........")
            return
        }
    }
    catch(e){
        util.logger.warn(agent.currentTestRun+" | Error in sending data on socket in dataConnHandler ",e);
    }
};

dataConnHandler.prototype.getSocket=function(){
    return this.client.socket;
}
module.exports = dataConnHandler;
