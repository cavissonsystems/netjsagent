/**
 * Created by bala on 24/7/15.
 */

var agentConfReader = require("./agent-setting");
var util = require('./util');
var metaDataRecovery = require('./metaData/ndMetaDataRecoveryProcess');
var serverConfig = require('./NDCServerConfig');

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
            + agentConfReader.appID + ";ndAppServerID=" + agentConfReader.serverID + ";ndAppServerHost=" + agentConfReader.getServerName() + ";tierName=" + agentConfReader.getTierName()
            + ";tierID=" + agentConfReader.tierID + ";NDCollectorIP=" + agentConfReader.ndcHost + ";NDCollectorPort="
            + agentConfReader.ndcPort + ";testIdx=" + agentConfReader.currentTestRun + "\n";

        if(agentConfReader.isTestRunning) {
            clientSocket.write(dataMessage);
            clientSocket.write("99,NewConnection,FPGVersion:1.0\n");
            if( !agentConfReader.continousRunningTest || serverConfig.isSwitchOver == 1 ) {
                serverConfig.isSwitchOver = 0;
                metaDataRecovery.handleAllMetaDataSending(clientSocket, true);
            }
            else if(agentConfReader.isdumpBtMetaData) {
                metaDataRecovery.sendCachedDataToNewClient(7,clientSocket);
                agentConfReader.isdumpBtMetaData = false
            }
        }

        util.logger.info(agentConfReader.currentTestRun+" | "+dataMessage);
        util.logger.info(agentConfReader.currentTestRun+" | 99,NewConnection,FPGVersion:1.0\n")
        util.logger.info(agentConfReader.currentTestRun+" | 11," + (new Date().getTime() - agentConfReader.cavEpochDiff * 1000) + ",All\n")
    }
    catch(e) {
        util.logger.warn(agentConfReader.currentTestRun+" | "+e);
    }
};


module.exports = DataMessageHandler;
