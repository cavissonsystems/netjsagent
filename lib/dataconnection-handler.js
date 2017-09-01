
var net = require('net');
var isToInstrument = false;

var agent = require("./agent-setting");
var DataMessageHandler = require("./datamessage-handler");
var util = require('./util');

var retrying=false;
var backlog = [];

function dataConnHandler(){
    this.client=null;
    this.timeout=null;
    this.dataMsgHandler=null;
    this.discardedFPLength = 0;
    /*
    * Adding NDCHost & port in constructor, so if control connection is getting close during running test
    * then agent will switch over and will try to connect with backup NDC, but Data and Auto connection will connect with
     * previous NDC, untill control connection with new server has been made
     * */
    this.ndcHost=0 ;this.ndcPort=7892;
}

dataConnHandler.prototype.createDataConn = function(server){
    try {
        this.ndcHost = server.ndcHost;              //Setting new Host port, at time of new Object [connection] creation
        this.ndcPort = server.ndcPort;
        var self = this;

        this.client = new net.Socket();

        this.client.on('error', function(err) {
               // util.logger.warn(agent.currentTestRun+" | Data connection], Received error event with retrying : "+retrying+", - "+err);
        });

        this.client.on('end', function(err) {
                //util.logger.warn(agent.currentTestRun+" | Data connection], Received end event with retrying : "+retrying+",  on socket-  "+err);
        });

        this.client.on('close', function(err) {
            util.logger.warn(agent.currentTestRun+" | Data connection], Received socket close event from Host : "+self.ndcHost+" ,Port="+self.ndcPort +", Error :  "+err);
            self.connectToServer();
        });

        this.client.on('connect', function() {
            try {
                //clearTimeout(self.timeout);
                self.timeout = undefined;
                util.logger.info(agent.currentTestRun+" | Data Connection established with NDCollector : Socket[addr="+self.ndcHost+",port="+self.ndcPort + ",localport=" +this.localPort );

                self.dataMsgHandler = new DataMessageHandler(self);
                if( backlog.length )
                {
                    for(var i= 0, len= backlog.length; len>i; ++i)
                        self.client.write(backlog[i]);

                    backlog.length= 0;
                }
            }
            catch(e){
                util.logger.warn(e);
            }

        });

        this.client.on("data", function (data) {
          //  console.log("data from ndc : " + data.toString());
        });

        this._connect();

    }catch(err){util.logger.warn(err);}
};


dataConnHandler.prototype.connectToServer=function()
{
    if(!agent.isTestRunning) {
        util.logger.warn(agent.currentTestRun+" | Test run is not running .")
        return;
    }

    var self=this;

    if(!this.client)
        return;

    if(self.client && self.client.writable)
        return;

    if(self.timeout)
        return;

    self.timeout = setTimeout(function () {
        try {
            self.timeout=undefined;
            self._connect();
            util.logger.warn(agent.currentTestRun+" | Timer for retrying Data connectoion expired. trying to connect with Host : "+self.ndcHost+" ,Port="+self.ndcPort);
        }catch(e){util.logger.warn(e);}
    }, 60000);
}

dataConnHandler.prototype.closeConnection =function()
{
    util.logger.info(agent.currentTestRun+" | Closing the Data connection .");
/*    this.client.on('close',null);
    this.client.on('connect',null);*/
    if(this.client != null)
        this.client.destroy();
    delete this.client;
    this.client=undefined;

    this.ndcHost=0 ;this.ndcPort=7892;
    this.timeout=null;
    this.discardedFPLength =0;
    delete this.dataMsgHandler ;
}

dataConnHandler.prototype._connect = function()
{
    var self = this;
    if(!agent.isTestRunning) {
        util.logger.warn(agent.currentTestRun+" | Test is not running ,error in making data connection")
        return;
    }
    if(!this.client)
        return;

    if(this.client.writable)
        return
    try {
        this.client.connect(self.ndcPort, self.ndcHost);
    }
    catch(err) {
        util.logger.warn(err);
    }
};

dataConnHandler.prototype.write=function(data){
    try{
        if(!this.client ||!data || !data.length)return
        if(this.client.bufferSize >= agent.ndDataBufferSize) {
            if(this.discardedFPLength % 1000 === 0) {
                util.logger.warn(agent.currentTestRun + " | Discarding Data conn data, Buffer size : ", this.client.bufferSize, " is greater then ndDataBufferSize");
                this.discardedFPLength=0
            }
            ++this.discardedFPLength;
            return false
        }
        if(this.client == undefined)
        {
            if(backlog.length <= 500)
                backlog.push(data);

            return
        }
        if(this.client.writable) {
            this.client.write(data);
        }
        else {
            if(backlog.length <= 500)
                backlog.push(data)
        }
        /*if(agent.dataConnHandler )
            this.client.write(data)*/
    }
    catch(e){
        util.logger.warn(e);
    }

};

module.exports = dataConnHandler;
