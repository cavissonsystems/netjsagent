
/**
 * Created by Siddhant on 09/08/2016.
 */

function ndHeapGCMonitorData(){
}
ndHeapGCMonitorData.num_full_gc = 0;
ndHeapGCMonitorData.num_inc_gc = 0;

ndHeapGCMonitorData.updateLatencyData = function (num_full_gc, num_inc_gc) {

    num_full_gc = parseInt(num_full_gc);
    num_inc_gc = parseInt(num_inc_gc);
    if (num_full_gc < ndHeapGCMonitorData.num_full_gc) {
        ndHeapGCMonitorData.num_full_gc = num_full_gc;
    }

    if (num_inc_gc > ndHeapGCMonitorData.num_inc_gc) {
        ndHeapGCMonitorData.num_inc_gc = num_inc_gc;
    }


    return ndHeapGCMonitorData;
}

ndHeapGCMonitorData.resetLatencyData = function(){
    ndHeapGCMonitorData.num_full_gc = 0;
    ndHeapGCMonitorData.num_inc_gc = 0;

    return ndHeapGCMonitorData ;
};
module.exports = ndHeapGCMonitorData;

