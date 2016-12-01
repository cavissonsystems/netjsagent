/**
 * Created by Sahil on 8/9/16.
 */

var generateHeapGCMonitor = require('./ndGenerateHeapGCMonitor.js');
var gc_profiler = require('cavisson-gc-profiler');
var heapGCMonitor = require('./ndHeapGCMonitorData');

var agentSetting = require('./../agent-setting');
var util = require('./../util');

function heapGcMonitor(){}

heapGcMonitor.init = function ()
{
    try {
        if (1 == agentSetting.enable_eventLoop_monitor && agentSetting.isTestRunning) {
            util.logger.info(agentSetting.currentTestRun+" | Event Loop Monitor started , data will dump in every 2 min.");
            var num_full_gc;
            var num_inc_gc;

            gc_profiler.on('gc', function (info) {
                heapGCMonitor.update(info.type, info.duration);
            });

            heapGcMonitor.heapGcTimer = setInterval(generateHeapGCMonitor.dumpData, agentSetting.ndMonitorInterval);
        }

    }
    catch(err)
    {util.logger.warn(agentSetting.currentTestRun+" | "+err)}
}

heapGcMonitor.stopHeapGC = function ()
{
    try {
        util.logger.info(agentSetting.currentTestRun + " | Cleaning monitor Heap gc");
        clearInterval(heapGcMonitor.heapGcTimer);
    }
    catch(err)
    {util.logger.warn(agentSetting.currentTestRun+" | "+err)}
}

module.exports = heapGcMonitor;