/**
 * Created by Harendra Kumar on 10/7/2016.
 */
require
var asMonitor = require('./autoSensorMonitor');
function ASManager(){
    }
ASManager.handledHotspotData = function (stack,duration,startTime,flowpathId,methodId,threadID,timeAccCav) {

    asMonitor.sendHotSpotRecord(stack,durationstartTime,flowpathId,methodId,threadID,timeAccCav);
}
module.exports = ASManager;