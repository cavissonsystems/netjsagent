/**
 * Created by Sahil on 8/9/16.
 */

var ndHeapGCMonitorData = require('./ndHeapGCMonitorData');
var stringBuffer = require('../flowpath/StringBuffer.js').StringBuffer;
var AgentSetting = require('../agent-setting');
var util = require('../util'),
    cluster = require('cluster');

function generatHeapMonitor(){}


generatHeapMonitor.createRecord = function(sb){
try {
    if(!cluster.isMaster) process.send({ndWorkerCount : "Send no. or workers"})

    var memoryUsage = process.memoryUsage();

    var rss = 0,
        heapUsed = 0,
        heapTotal = 0;
    var scavengeGcCount = (ndHeapGCMonitorData.scavenge_gc * 60000) / AgentSetting.ndMonitorInterval;
    var markSweepCompactGcCount = (ndHeapGCMonitorData.markSweepCompact_gc * 60000) / AgentSetting.ndMonitorInterval;
    rss = memoryUsage.rss;
    rss = parseInt((rss / 1048576).toFixed(3));     //bytes to MB

    heapTotal = memoryUsage.heapTotal;
    heapTotal = parseInt((heapTotal / 1048576).toFixed(3));

    heapUsed = memoryUsage.heapUsed;
    heapUsed = parseInt((heapUsed / 1048576).toFixed(3));

    sb.clear();
    sb.add('88,');
    sb.add(AgentSetting.vectorPrefixID);
    sb.add('1');                        //VectorID
    sb.add(':');
    sb.add(AgentSetting.vectorPrefixForNodeMonitors);
    sb.add('|');
    sb.add(scavengeGcCount);
    sb.add(' ');
    sb.add(markSweepCompactGcCount);
    sb.add(' ');
    sb.add(ndHeapGCMonitorData.scavenge_gc_duration);
    sb.add(' ');
    sb.add(ndHeapGCMonitorData.markSweepCompact_gc_duration);
    sb.add(' ');
    sb.add(rss);
    sb.add(' ');
    sb.add(heapTotal);
    sb.add(' ');
    sb.add(heapUsed);
    sb.add(' ');
    sb.add(ndHeapGCMonitorData.ndWorkerCount);
    sb.add('\n');
}
    catch(err){console.log(err)}
}

generatHeapMonitor.dumpData = function()
{
    try{

        if (AgentSetting.isToInstrument && AgentSetting.autoSensorConnHandler) {
            var sb = new stringBuffer();
            generatHeapMonitor.createRecord(sb);
            //Clearing all values .
            ndHeapGCMonitorData.reset();
            AgentSetting.autoSensorConnHandler.write(sb.toString());
        }

    }
    catch(err) {
        util.logger.warn(AgentSetting.currentTestRun+" | Cant dump Event monitoring data : " + err);
    }
}

module.exports = generatHeapMonitor ;
