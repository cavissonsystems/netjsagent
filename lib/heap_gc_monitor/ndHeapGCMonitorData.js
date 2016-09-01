
/**
 * Created by Siddhant on 09/08/2016.
 */

function ndHeapGCMonitorData(){
}
ndHeapGCMonitorData.num_full_gc = 0;
ndHeapGCMonitorData.num_inc_gc = 0;

ndHeapGCMonitorData.update = function (num_full_gc, num_inc_gc) {

        ndHeapGCMonitorData.num_full_gc = parseInt(num_full_gc);

        ndHeapGCMonitorData.num_inc_gc = parseInt(num_inc_gc);

}

ndHeapGCMonitorData.reset = function(){

};
module.exports = ndHeapGCMonitorData;

