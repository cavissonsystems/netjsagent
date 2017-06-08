/**
 * Created by Siddhant on 18-09-2015.
 */

var agentConfReader = require("./agent-setting");
var util = require("./util");

function AutoSensorMessageHandler(clientSocket) {
    this.clientSocket = clientSocket;
    this.handleMessages();
}

AutoSensorMessageHandler.prototype.handleMessages = function()
{
    try {
        var clientSocket = this.clientSocket;

        var autoSensorMessage = "auto_sensor_thread_hotspot_data_req:appName=" + agentConfReader.getInstance() + ";appID="
            + agentConfReader.appID + ";ndAppServerID=" + agentConfReader.serverID + ";ndAppServerHost=" + agentConfReader.getServerName() + ";tierName=" + agentConfReader.getTierName()
            + ";tierID=" + agentConfReader.tierID + ";NDCollectorIP=" + agentConfReader.ndCollectorIP + ";NDCollectorPort="
            + agentConfReader.ndcPort + ";testIdx=" + agentConfReader.currentTestRun + "\n";

        util.logger.info(agentConfReader.currentTestRun + " | " + autoSensorMessage);

        if (agentConfReader.isTestRunning) {
            try {
                clientSocket.write(autoSensorMessage);
            } catch (e) {
                util.logger.warn(agentConfReader.currentTestRun + " | " + e);
            }
        }
    }catch(e){util.logger.warn(agentConfReader.currentTestRun+" | "+e);}
};


module.exports = AutoSensorMessageHandler;