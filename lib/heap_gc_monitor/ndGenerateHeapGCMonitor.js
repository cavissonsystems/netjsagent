/**
 * Created by Sahil on 8/9/16.
 */

var ndHeapGCMonitorData = require('./ndHeapGCMonitorData');
var stringBuffer = require('../flowpath/StringBuffer.js').StringBuffer;
var AgentSetting = require('../agent-setting');
var util = require('../util')

function generatHeapMonitor(){}


generatHeapMonitor.createEventRecord = function(sb){

    var vectorPrefix = AgentSetting.tierName + AgentSetting.ndVectorSeparator + AgentSetting.ndAppServerHost + AgentSetting.ndVectorSeparator + AgentSetting.appName + AgentSetting.ndVectorSeparator;
    var vectorPrefixID = AgentSetting.tierID + "|" + AgentSetting.appID + "|" + "1";

    var memoryUsage = JSON.stringify(process.memoryUsage()).split(',');

    var rss = 0;
    var heapUsed = 0;
    var heapTotal = 0;

    for (var i in memoryUsage) {
        if (-1 != memoryUsage[i].indexOf("rss")) {
            rss = memoryUsage[i].split(':')[1];
        }
        if (-1 != memoryUsage[i].indexOf("heapTotal")) {
            heapTotal = memoryUsage[i].split(':')[1];
        }
        if (-1 != memoryUsage[i].indexOf("heapUsed")) {
            heapUsed = memoryUsage[i].split(':')[1];
            heapUsed = heapUsed.substring(0,heapUsed.length-1);
        }
    }


        sb.clear();

    sb.add('88,');
    sb.add(vectorPrefixID);
    sb.add(':');
    sb.add(vectorPrefix);
    sb.add('HeapGCMonitor');
    sb.add('|');
    sb.add(ndHeapGCMonitorData.num_full_gc);
    sb.add(' ');
    sb.add(ndHeapGCMonitorData.num_inc_gc);
    sb.add(' ');
    sb.add(rss);
    sb.add(' ');
    sb.add(heapTotal);
    sb.add(' ');
    sb.add(heapUsed);
    sb.add('\n');

    return sb ;
}

generatHeapMonitor.dumpEventMonitoringData = function()
{
    try{
      var sb = new stringBuffer();
        if (AgentSetting.isToInstrument && AgentSetting.dataConnHandler) {
            var data = generatHeapMonitor.createEventRecord(sb,AgentSetting).toString();

            util.logger.info("Dumping Even tMonitoring Data : " + data);

            AgentSetting.autoSensorConnHandler.client.write(data);
        }

        //Clearing all values .
        eventMonitoringData.resetLatencyData();
    }
    catch(err) {
        util.logger.warn("Cant dump Event monitoring data : " + err);
    }
}

module.exports = generatHeapMonitor ;
