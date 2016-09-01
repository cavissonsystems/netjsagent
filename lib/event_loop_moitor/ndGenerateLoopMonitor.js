/**
 * Created by Sahil on 8/9/16.
 */

var eventMonitoringData = require('./ndEventLoopMonitorData');
var stringBuffer = require('../flowpath/StringBuffer.js').StringBuffer;
var AgentSetting = require('../agent-setting');
var util = require('../util')

function generateLoopMonitor(){}


generateLoopMonitor.createEventRecord = function(sb){

    for(i in eventMonitoringData.eventArray)
    {
        eventMonitoringData.latencyDuration = parseInt(eventMonitoringData.eventArray[i]) + parseInt(eventMonitoringData.latencyDuration) ;
    }
    eventMonitoringData.latencyAverageDuration = eventMonitoringData.latencyDuration / eventMonitoringData.latencyCount;

    var vectorPrefix = AgentSetting.tierName + AgentSetting.ndVectorSeparator + AgentSetting.ndAppServerHost + AgentSetting.ndVectorSeparator + AgentSetting.appName + AgentSetting.ndVectorSeparator;
    var vectorPrefixID = AgentSetting.tierID + "|" + AgentSetting.appID + "|" + "1";

    sb.clear();

    sb.add('89,');
    sb.add(vectorPrefixID);
    sb.add(':');
    sb.add(vectorPrefix);
    sb.add('eventLoopMonitor');
    sb.add('|');
    sb.add(eventMonitoringData.minLatencyDuration);
    sb.add(' ');
    sb.add(eventMonitoringData.maxLatencyDuration);
    sb.add(' ');
    sb.add(parseInt(eventMonitoringData.latencyAverageDuration));
    sb.add(' ');
    sb.add(eventMonitoringData.latencyCount);
    sb.add(' ');
    sb.add(eventMonitoringData.latestLatency);
    sb.add('\n');

    return sb ;
}

generateLoopMonitor.dumpEventMonitoringData = function()
{
    try{
      var sb = new stringBuffer();
        if (AgentSetting.isToInstrument && AgentSetting.dataConnHandler) {
            var data = generateLoopMonitor.createEventRecord(sb,AgentSetting).toString();

            util.logger.info("Dumping Even tMonitoring Data : " + data);

            AgentSetting.autoSensorConnHandler.client.write(data);
        }

        //Clearing all values .
        eventMonitoringData.resetLatencyData();
        eventMonitoringData.eventArray = []
    }
    catch(err) {
        util.logger.warn("Cant dump Event monitoring data : " + err);
    }
}

module.exports = generateLoopMonitor ;
