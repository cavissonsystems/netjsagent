/**
 * Created by bala on 10/7/15.
 */
var net = require('net');
var MessageHandler = require('./controlmessage-handler');
var agentSetting = require("./agent-setting");
var util = require('./util');
var path = require('path');
var ndSettingFile = path.join(path.resolve(__dirname),'/../../../ndSettings.conf');

var clientConn;
var retrying=false;
var timeOut;
var client ;

function clientConn()
{

}

clientConn.connectToServer = function(){

    try {
        clientConn = this;

        client = new net.Socket();

        client.on('error', function(err) {
                util.logger.error(agentSetting.currentTestRun+" | Control connection, Received error event with retrying : "+retrying+", - " + err);
              });

        client.on('end', function(err) {
                util.logger.error(agentSetting.currentTestRun+" | Control connection, Received end event with retrying : "+retrying+", on socket-  " + err);
        });

        client.on('close', function(err) {
            try {
                if (!retrying) {
                    retrying=true;
                    connectToServer();
                }
                util.logger.error(agentSetting.currentTestRun+" | Control connection, Received socket close event with retrying : "+retrying+", - " + err);
            }
            catch(err){util.logger.warn(agentSetting.currentTestRun+" | Error in retrying for control connection ." + err);}
        });

        client.on('connect', function() {
            try {
                retrying=false;
                if(timeOut){
                    clearInterval(timeOut);
                }
                util.logger.info(agentSetting.currentTestRun+" | Connected successfully with : "+agentSetting.getPort() + "," + agentSetting.getNDCHost());
                var controlMessageHandler = new MessageHandler(this);
            }
            catch(err){util.logger.warn(agentSetting.currentTestRun+" | error" + err);}
        });

        clientConn._connect();
    }
    catch(err){util.logger.warn("error" + err);}
};


function connectToServer()
{
    agentSetting.checkNDSettingFile(ndSettingFile);
    timeOut = setInterval(function () {
        try {
            util.logger.warn(agentSetting.currentTestRun+" | Timer for retrying control connectoion expired. trying to connect...")
            clientConn._connect();
        }
        catch(err){util.logger.warn(agentSetting.currentTestRun+" | Error in retrying" + err);}
    }, 60000);
}


clientConn._connect = function()
{
    try{
        client.connect(agentSetting.getPort(), agentSetting.getNDCHost(), function () {})
    }
    catch(err){util.logger.warn(agentSetting.currentTestRun+" | Error in making connection" + err);}

};



module.exports = clientConn;

