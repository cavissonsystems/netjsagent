/**
 * Created by Sahil on 8/9/16.
 */

var generateLoopMonitor = require('./ndGenerateLoopMonitor.js');
var monitor = require('event-loop-monitor');
var eventMonitor = require('./ndEventLoopMonitorData');

var agentSetting = require('./../agent-setting');
var util = require('./../util');

function eventLoopMonitor(){}
eventLoopMonitor.eventLoopTimer=undefined;

eventLoopMonitor.handleEventLoopMonitor = function () {
    1 == agentSetting.enable_eventLoop_monitor ? (agentSetting.agentMode >= 1 ? eventLoopMonitor.init() : eventLoopMonitor.stopEvnetloopMonitor()) : eventLoopMonitor.stopEvnetloopMonitor();
}

eventLoopMonitor.init = function ()
{
    try {
        util.logger.info(agentSetting.currentTestRun+" | Loop Monitoring started , data will dump in every :",agentSetting.ndMonitorInterval);
        monitor.on('data', function (latencyData) {
            try {
                var latency = latencyData.p100 / 1000;          //In ms

                eventMonitor.update(latency);
            }
            catch(err)
            {util.logger.warn(agentSetting.currentTestRun+" | Error in taking latency for event loop monitor .")}
        });
        monitor.resume(agentSetting.ndMonitorInterval);
        if(eventLoopMonitor.eventLoopTimer===undefined)
        eventLoopMonitor.eventLoopTimer = setInterval(generateLoopMonitor.dumpData, agentSetting.ndMonitorInterval);
    }
    catch(err)
    {util.logger.warn(agentSetting.currentTestRun+" | "+err)}
}

eventLoopMonitor.stopEvnetloopMonitor = function ()
{
    monitor.stop();
    util.logger.info(agentSetting.currentTestRun+" | Cleaning Event loop monitor .");
    clearInterval(eventLoopMonitor.eventLoopTimer);
    eventLoopMonitor.eventLoopTimer=undefined;
}

module.exports = eventLoopMonitor;
