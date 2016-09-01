/**
 * Created by Sahil on 8/9/16.
 */

var generateLoopMonitor = require('./ndGenerateLoopMonitor.js');
var monitor = require('event-loop-monitor');
var eventMonitor = require('./ndEventLoopMonitorData');

var agentSetting = require('./../agent-setting');
var util = require('./../util');

function eventLoopMonitor(){}

eventLoopMonitor.init = function ()
{
    util.logger.info("Loop Monitoring started");
    try {
        if (1 == agentSetting.enable_eventLoop_monitor) {
            monitor.on('data', function (latencyData) {
                try {
                    var latency = JSON.stringify(latencyData).split(',');
                    for (var i in latency) {
                        if (-1 != latency[i].indexOf("p100")) {
                            var value = latency[i].split(':')[1];
                            value = value.substring(0, value.length - 1);
                            eventMonitor.eventArray.push(value);
                            eventMonitor.updateLatencyData(value);
                        }
                    }
                }
                catch(err)
                {util.logger.warn("Error in taking latency for event loop monitor .")}
            });
            monitor.resume();
            myEventMonitoringTime = setInterval(generateLoopMonitor.dumpEventMonitoringData, 120000);
        }
    }
    catch(err)
    {console.log(err)}
}
module.exports = eventLoopMonitor;