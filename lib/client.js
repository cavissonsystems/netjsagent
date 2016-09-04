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
        clientConn._createServer();
    }, 1000);
}




clientConn._createServer = function()
{
    var client = new net.Socket();

    try {

        client.on('error', function(err)
        {
            util.logger.warn("retry");
        });

        client.on('close', function(err)
        {
            delete  client; //destroying client explicitly

            if(isClientConnected) {
                isClientConnected = false;
                connectToServer();
            }
        });

        client.connect(agentSetting.getPort(), agentSetting.getNDCHost(), function () {

            console.log("Connecting with "+agentSetting.getPort() + "," + agentSetting.getNDCHost() +","+agentSetting.instance);
            util.logger.info(agentSetting.getPort() + "," + agentSetting.getNDCHost());

        });


        client.on('connect', function() {

            clearInterval(timeOut);
            isClientConnected = true;
            var controlMessageHandler = new MessageHandler(this);

        });
    }
    catch(err)
    {
        util.logger.warn("error" + err);
    }
};



module.exports = clientConn;

