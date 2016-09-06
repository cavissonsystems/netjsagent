/**
 * Created by bala on 24/7/15.
 */

var agentConfReader = require("./agent-setting");
var util = require('./util');


function DataMessageHandler(clientSocket)
{
    this.clientSocket = clientSocket;
    this.handleMessages();
}

DataMessageHandler.prototype.handleMessages = function()
{
    try {
        var clientSocket = this.clientSocket;

        /* nd_data_msg_req:appName=NodeJSInstance;appID=4;ndAppServerID=4;ndAppServerHost=NodeJSServer;tierName=Tier1;tierID=2;
         NDCollectorIP=10.10.60.6;NDCollectorPort=7892;testIdx=6962;*/

        var dataMessage = "nd_data_msg_req:appName=" + agentConfReader.getInstance() + ";appID="
            + agentConfReader.appID + ";ndAppServerID=" + agentConfReader.ndAppServerID + ";ndAppServerHost=" + agentConfReader.getServerName() + ";tierName=" + agentConfReader.getTierName()
            + ";tierID=" + agentConfReader.tierID + ";NDCollectorIP=" + agentConfReader.ndCollectorIP + ";NDCollectorPort="
            + agentConfReader.ndlPort + ";testIdx=" + agentConfReader.testIdx + "\n";

        util.logger.info(dataMessage);
        clientSocket.write(dataMessage);


        clientSocket.write("99,NewConnection,FPGVersion:1.0\n");
        clientSocket.write("11," + (agentConfReader.bciStartUpTime - agentConfReader.cavEpochDiff * 1000) + ",All\n");

    }
    catch(err) {
        util.logger.warn(err);
    }
};


module.exports = DataMessageHandler;