
/**
 * Created by Siddhant on 09/08/2016.
 */

function ndEventLoopMonitorData(){
}

ndEventLoopMonitorData.minLatencyDuration = Number.MAX_VALUE;
ndEventLoopMonitorData.maxLatencyDuration = 0;
ndEventLoopMonitorData.latencyDuration = 0;
ndEventLoopMonitorData.latencyCount = 0;
ndEventLoopMonitorData.latencyAverageDuration = 0;
ndEventLoopMonitorData.latestLatency = 0;

ndEventLoopMonitorData.eventArray = [];

ndEventLoopMonitorData.updateLatencyData = function (latency) {
try {
    latency = parseInt(latency)
    if (latency < ndEventLoopMonitorData.minLatencyDuration) {
        ndEventLoopMonitorData.minLatencyDuration = latency;
    }

    if (latency > ndEventLoopMonitorData.maxLatencyDuration) {
        ndEventLoopMonitorData.maxLatencyDuration = latency;
    }

    ndEventLoopMonitorData.latencyCount = ndEventLoopMonitorData.latencyCount + 1;

    ndEventLoopMonitorData.latestLatency = latency;

    return ndEventLoopMonitorData;
}
    catch(err){console.log(err)}
}

ndEventLoopMonitorData.resetLatencyData = function(){
    ndEventLoopMonitorData.minLatencyDuration = Number.MAX_VALUE;
    ndEventLoopMonitorData.maxLatencyDuration = 0;
    ndEventLoopMonitorData.latencyDuration = 0;
    ndEventLoopMonitorData.latencyCount = 0;
    ndEventLoopMonitorData.latencyAverageDuration = 0;

    return ndEventLoopMonitorData ;
}
//exports.ndEventLoopMonitorData = ndEventLoopMonitorData;
module.exports = ndEventLoopMonitorData;

