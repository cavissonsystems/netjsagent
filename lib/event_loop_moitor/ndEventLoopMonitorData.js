
/**
 * Created by Siddhant on 09/08/2016.
 */

function ndEventLoopMonitorData(){}

ndEventLoopMonitorData.latency = 0;

ndEventLoopMonitorData.update = function (latency) {
try {
   if(latency > ndEventLoopMonitorData.latency )
    ndEventLoopMonitorData.latency= latency;

}
    catch(err){console.log(err)}
}

ndEventLoopMonitorData.reset = function(){
    ndEventLoopMonitorData.latency = 0;


}
//exports.ndEventLoopMonitorData = ndEventLoopMonitorData;
module.exports = ndEventLoopMonitorData;

