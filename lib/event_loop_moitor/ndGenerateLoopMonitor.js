/**
 * Created by Sahil on 8/9/16.
 */

var eventMonitoringData = require('./ndEventLoopMonitorData');
var stringBuffer = require('../flowpath/StringBuffer.js').StringBuffer;
var eventLoopStats
try {
    eventLoopStats = require('cavisson-event-loop-stats');
}
catch(e){console.log("Can't find module cavisson-event-loop-stats ")}
var AgentSetting = require('../agent-setting');
var util = require('../util');

function generateLoopMonitor(){}

generateLoopMonitor.createRecord = function(sb){
    var loopStats = eventLoopStats.sense();

    var avg =0.0,
        min =0.0,
        max =0.0,
        totalLoops =0.0;

    min = loopStats.min;                                 //Maximum number of milliseconds spent in a single loop since last sense call
    max = loopStats.max;                                 //Minimum number of milliseconds spent in a single loop since last sense call
    avg = parseInt(loopStats.sum / loopStats.num);       //average of Total number of milliseconds spent in the loop since last sense call by Total number of loops  .
    totalLoops = loopStats.num;                                 //Total number of loops since last sense call

    sb.clear();

    sb.add('89,');
    sb.add(AgentSetting.vectorPrefixID);
    sb.add("1");                        //VectorID
    sb.add(':');
    sb.add(AgentSetting.vectorPrefixForNodeMonitors);
 //   sb.add('eventLoopMonitor');
    sb.add('|');
    sb.add(eventMonitoringData.latency);
    sb.add(' '+avg)
    sb.add(' '+min)
    sb.add(' '+max)
    sb.add(' '+totalLoops)
    sb.add('\n');

}

generateLoopMonitor.dumpData = function()
{
    try{
        if(!eventLoopStats) {
            util.logger.error(AgentSetting.currentTestRun,'| Cannot load cavisson-eventLoopStats ,eventLoopStats value is :',eventLoopStats)
            return
        }
        var sb = new stringBuffer();
        if (AgentSetting.isToInstrument && AgentSetting.dataConnHandler) {
            generateLoopMonitor.createRecord(sb);

            //util.logger.info("Dumping Even tMonitoring Data : " + sb.toString());

            AgentSetting.autoSensorConnHandler.write(sb.toString());
        }

        //Clearing all values .
        eventMonitoringData.reset();
    }
    catch(err) {
        util.logger.warn("Cant dump Event monitoring data : " + err);
    }
}

module.exports = generateLoopMonitor ;
