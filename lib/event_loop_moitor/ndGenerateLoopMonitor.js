/**
 * Created by Sahil on 8/9/16.
 */

var eventMonitoringData = require('./ndEventLoopMonitorData');
var stringBuffer = require('../flowpath/StringBuffer.js').StringBuffer;
var AgentSetting = require('../agent-setting');
var util = require('../util');

function generateLoopMonitor(){}


generateLoopMonitor.createRecord = function(sb){

    var vectorPrefix = AgentSetting.tierName + AgentSetting.ndVectorSeparator + AgentSetting.ndAppServerHost + AgentSetting.ndVectorSeparator + AgentSetting.appName ;//+ AgentSetting.ndVectorSeparator;
    var vectorPrefixID = AgentSetting.tierID + "|" + AgentSetting.appID + "|" + "1";

    sb.clear();

    sb.add('89,');
    sb.add(vectorPrefixID);
    sb.add(':');
    sb.add(vectorPrefix);
 //   sb.add('eventLoopMonitor');
    sb.add('|');
    sb.add(eventMonitoringData.latency);
    sb.add('\n');

}

generateLoopMonitor.dumpData = function()
{
    try{

        if (AgentSetting.isToInstrument && AgentSetting.autoSensorConnHandler) {
            var sb = new stringBuffer();
            generateLoopMonitor.createRecord(sb);

            AgentSetting.autoSensorConnHandler.write(sb.toString());
        }

        //Clearing all values .
        eventMonitoringData.reset();
    }
    catch(err) {
        util.logger.warn(AgentSetting.currentTestRun+" | Cant dump Event monitoring data : " + err);
    }
}

module.exports = generateLoopMonitor ;
