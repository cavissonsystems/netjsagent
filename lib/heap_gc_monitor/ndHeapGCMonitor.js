/**
 * Created by Sahil on 8/9/16.
 */

var generateHeapGCMonitor = require('./ndGenerateHeapGCMonitor.js');
var gc_profiler
try {
    gc_profiler = require('cavisson-gc-profiler');
}catch(e){console.log("Can't find module cavisson-gc-profiler ")}
var heapGCMonitor = require('./ndHeapGCMonitorData');

var agentSetting = require('./../agent-setting');
var util = require('./../util');

function heapGcMonitor(){}

heapGcMonitor.handleHeapGcMonitor = function(){
    1 == agentSetting.enable_garbage_profiler ? heapGcMonitor.init() : heapGcMonitor.stopHeapGC();
}

heapGcMonitor.init = function ()
{
    try {
        if(!gc_profiler) {
            util.logger.error(agentSetting.currentTestRun,'| Cannot load cavisson-gc-profiler ,gc_profiler value is :',gc_profiler)
            return
        }
        if (agentSetting.isTestRunning) {
            util.logger.info(agentSetting.currentTestRun+" | Heap GC Monitor Monitor started .");
            var num_full_gc;
            var num_inc_gc;

            gc_profiler.on('gc', function (info) {
                heapGCMonitor.update(info.type, info.duration);
            });

            heapGcMonitor.heapGcTimer = setInterval(generateHeapGCMonitor.dumpData, agentSetting.ndMonitorInterval);
        }
        /*Reding message sent by Master for worker count */
        process.on('message',function(msg) {
            if(msg.ndWorkerCount) heapGCMonitor.ndWorkerCount = msg.ndWorkerCount;
        })

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