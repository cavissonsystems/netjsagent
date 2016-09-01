/**
 * Created by Sahil on 8/9/16.
 */

var generateHeapGCMonitor = require('./ndGenerateHeapGCMonitor.js');
var memwatch = require('memwatch-next');
var heapGCMonitor = require('./ndHeapGCMonitorData');

var agentSetting = require('./../agent-setting');
var util = require('./../util');

function heapGcMonitor(){}

heapGcMonitor.init = function ()
{
    util.logger.info("Loop Monitoring started");
    try {
        var num_full_gc ;
        var num_inc_gc ;
        memwatch.on('stats', function (stats) {

                var stats = JSON.stringify(stats).split(',');
                for (var i in stats) {
                    if (-1 != stats[i].indexOf("num_full_gc")) {
                        num_full_gc = stats[i].split(':')[1];
                    }
                    if (-1 != stats[i].indexOf("num_inc_gc")) {
                        num_inc_gc = stats[i].split(':')[1];
                    }

                    heapGCMonitor.update(num_full_gc,num_inc_gc);

                }
            });
            setInterval(generateHeapGCMonitor.dumpData, 12000);

    }
    catch(err)
    {console.log(err)}
}
module.exports = heapGcMonitor;