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
                            var value = latency[i].split(':')[1];       //latency value is in microseconds
                            value = parseInt(value.substring(0, value.length - 1)/1000);        //In milliseconds
                            //eventMonitor.eventArray.push(value);
                            eventMonitor.update(value);
                        }
                    }
                }
                catch(err)
                {util.logger.warn("Error in taking latency for event loop monitor .")}
            });
            monitor.resume();
            setInterval(generateLoopMonitor.dumpData, 12000);
        }
    }
    catch(err)
    {console.log(err)}
}
module.exports = eventLoopMonitor;