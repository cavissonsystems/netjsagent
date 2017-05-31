
/**
 * Created by Siddhant on 09/08/2016.
 */

function ndHeapGCMonitorData(){
}
ndHeapGCMonitorData.scavenge_gc = 0;
ndHeapGCMonitorData.scavenge_gc_duration = 0;
ndHeapGCMonitorData.markSweepCompact_gc = 0;
ndHeapGCMonitorData.markSweepCompact_gc_duration = 0;
ndHeapGCMonitorData.ndWorkerCount = 0;


ndHeapGCMonitorData.update = function (gc_type, gc_duration) {

    if(gc_type === 'Scavenge') {
        ndHeapGCMonitorData.scavenge_gc = ndHeapGCMonitorData.scavenge_gc + 1;
        ndHeapGCMonitorData.scavenge_gc_duration += gc_duration;
    }
    else if(gc_type === 'MarkSweepCompact'){
        ndHeapGCMonitorData.markSweepCompact_gc = ndHeapGCMonitorData.markSweepCompact_gc + 1;;
        ndHeapGCMonitorData.markSweepCompact_gc_duration += gc_duration;;
    }
}

ndHeapGCMonitorData.reset = function(){
    ndHeapGCMonitorData.scavenge_gc = 0;
    ndHeapGCMonitorData.scavenge_gc_duration = 0;
    ndHeapGCMonitorData.markSweepCompact_gc = 0;
    ndHeapGCMonitorData.markSweepCompact_gc_duration = 0;
    ndHeapGCMonitorData.ndWorkerCount = 0;
};
module.exports = ndHeapGCMonitorData;

