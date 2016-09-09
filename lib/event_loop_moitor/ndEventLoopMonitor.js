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
    try {
        if (1 == agentSetting.enable_eventLoop_monitor && agentSetting.isTestRunning) {
            util.logger.info(agentSetting.currentTestRun+" | Loop Monitoring started , data will dump in every 2 min .");
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
                {util.logger.warn(agentSetting.currentTestRun+" | Error in taking latency for event loop monitor .")}
            });
            monitor.resume();
            eventLoopMonitor.eventLoopTimer = setInterval(generateLoopMonitor.dumpData, 120000);
        }
    }
    catch(err)
    {util.logger.warn(agentSetting.currentTestRun+" | "+err)}
}

eventLoopMonitor.stopEvnetloopMonitor = function ()
{
    util.logger.info(agentSetting.currentTestRun+" | Cleaning Event loop monitor .");
    clearInterval(eventLoopMonitor.eventLoopTimer);
}

module.exports = eventLoopMonitor;