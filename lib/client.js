/**
 * Created by bala on 10/7/15.
 */
var net = require('net');
var MessageHandler = require('./controlmessage-handler');
var agentSetting = require("./agent-setting");
var util = require('./util');

var clientConn;
var isClientConnected = false;
var timeOut;

function clientConn()
{

}

clientConn.connectToServer = function(){
    clientConn = this;
    connectToServer();
};


function connectToServer()
{
    timeOut = setInterval(function () {
        util.logger.warn("Timer for retrying control connectoion expired. trying to connect...")
        clientConn._connect();
    }, 60000);
}




clientConn._connect = function()
{
    var client = new net.Socket();

    try {

        client.on('error', function(err)
        {
            if(isClientConnected){
                connectToServer();
            }
            isClientConnected = false;
            util.logger.error("Control connection], Received error event- "+err);

        });

        client.on('end', function(err)
        {
            if(isClientConnected){
                connectToServer();
            }
            isClientConnected = false;
            util.logger.error("Control connection], Received end event on socket-  "+err);

        });

        client.on('close', function(err)
        {
            if(isClientConnected){
                connectToServer();
            }
            isClientConnected = false;
            util.logger.error("Control connection], Received socket close event-  "+err);

        });

        client.connect(agentSetting.getPort(), agentSetting.getNDCHost(), function () {

            util.logger.info(agentSetting.getPort() + "," + agentSetting.getNDCHost());

        });


        client.on('connect', function() {
            try {
                isClientConnected = true;
                clearInterval(timeOut);
                var controlMessageHandler = new MessageHandler(this);
            }
            catch(err){util.logger.warn("error" + err);}
        });
    }
    catch(err)
    {
        util.logger.warn("error" + err);
    }
};



module.exports = clientConn;

