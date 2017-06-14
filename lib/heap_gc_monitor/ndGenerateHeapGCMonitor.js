/**
 * Created by Sahil on 8/9/16.
 */

var ndHeapGCMonitorData = require('./ndHeapGCMonitorData');
var stringBuffer = require('../flowpath/StringBuffer.js').StringBuffer;
var AgentSetting = require('../agent-setting');
var util = require('../util'),
    cluster = require('cluster'),
    v8 = require('v8');    //v8 package contains heap space statistics

function generatHeapMonitor(){}


generatHeapMonitor.createRecord = function(sb){
try {

    //Assigning default values for Heap_GC_Space
    var new_space_tot= 0,new_space_used= 0,old_space_tot= 0,old_space_used= 0,code_space_tot= 0,code_space_used= 0,map_space_tot= 0,map_space_used= 0,large_obj_space_tot= 0,large_obj_space_used= 0,heapSpace_Size_obj;
    try { //Include this try catch block because in node version of 6 and above it working, may be lower then 6 version, did not find these spaces.
        heapSpace_Size_obj = v8.getHeapSpaceStatistics();

        //We are fetching only total space and used space size.
        for (var i = 0; i < heapSpace_Size_obj.length; i++) {

            if (heapSpace_Size_obj[i].space_name == "new_space") {
                new_space_tot = heapSpace_Size_obj[i].space_size;
                new_space_used = heapSpace_Size_obj[i].space_used_size;

            } else if (heapSpace_Size_obj[i].space_name == "old_space") {
                old_space_tot = heapSpace_Size_obj[i].space_size;
                old_space_used = heapSpace_Size_obj[i].space_used_size;

            } else if (heapSpace_Size_obj[i].space_name == "code_space") {
                code_space_tot = heapSpace_Size_obj[i].space_size;
                code_space_used = heapSpace_Size_obj[i].space_used_size;

            } else if (heapSpace_Size_obj[i].space_name == "map_space") {
                map_space_tot = heapSpace_Size_obj[i].space_size;
                map_space_used = heapSpace_Size_obj[i].space_used_size;

            } else if (heapSpace_Size_obj[i].space_name == "large_object_space") {
                large_obj_space_tot = heapSpace_Size_obj[i].space_size;
                large_obj_space_used = heapSpace_Size_obj[i].space_used_size;

            }
        }
    }catch(err){
        util.logger.warn(AgentSetting.currentTestRun+" | Getting error in Heap_Space_Statistics  : " + err);
        new_space_tot= 0,new_space_used= 0,old_space_tot= 0,old_space_used= 0,code_space_tot= 0,code_space_used= 0,map_space_tot= 0,map_space_used= 0,large_obj_space_tot= 0,large_obj_space_used= 0;
    }
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
    sb.add(' ');
    sb.add(new_space_tot);
    sb.add(' ');
    sb.add(new_space_used);
    sb.add(' ');
    sb.add(old_space_tot);
    sb.add(' ');
    sb.add(old_space_used);
    sb.add(' ');
    sb.add(code_space_tot);
    sb.add(' ');
    sb.add(code_space_used);
    sb.add(' ');
    sb.add(map_space_tot);
    sb.add(' ');
    sb.add(map_space_used);
    sb.add(' ');
    sb.add(large_obj_space_tot);
    sb.add(' ');
    sb.add(large_obj_space_used);
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
