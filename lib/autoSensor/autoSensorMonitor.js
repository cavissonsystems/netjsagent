/**
 * Created by Harendra Kumar on 10/7/2016.
 */

var agentConfReader = require("../agent-setting");
var asGrphData = require('./autoSensorDataModel');
var samples = require('../nodetime/lib/samples');
var util = require("../util");
var reportBuffer;
var isNewMonitorRecordEnabled = false;

function ASDataMonitor(){}

//We are not using this function as dumpping only 53 record.
ASDataMonitor.setMonitorEnabledForID = function (backendMonitorvalue) {
    if(Number(backendMonitorvalue) > 0)
        isNewMonitorRecordEnabled = true;
    else
        isNewMonitorRecordEnabled = false;
}
ASDataMonitor.sendThreadSummaryReport = function(){

    try {
        var reportBuffer;

        reportBuffer = "53,";
        reportBuffer += agentConfReader.tierID+"|"+agentConfReader.appID+"|";
        reportBuffer += "1";
        reportBuffer += ':';
        reportBuffer += agentConfReader.getTierName()+">"+agentConfReader.getServerName()+">"+agentConfReader.getInstance();
        reportBuffer += '|';
        reportBuffer += "1";
        reportBuffer += agentConfReader.RECORD_SEPRATOR_SPACE;
        reportBuffer += asGrphData.getTotalCountAllHotSpotThreads();
        reportBuffer += agentConfReader.RECORD_SEPRATOR_SPACE;

        // All Hotspot Threads Duration (Secs)
        reportBuffer += asGrphData.getAvgTimeAllHotSpotThreads();
        reportBuffer += agentConfReader.RECORD_SEPRATOR_SPACE;
        reportBuffer += asGrphData.getMinTimeAllHotSpotThread();
        reportBuffer += agentConfReader.RECORD_SEPRATOR_SPACE;
        reportBuffer += asGrphData.getMaxTimeAllHotSpotThread();
        reportBuffer += agentConfReader.RECORD_SEPRATOR_SPACE;
        reportBuffer += asGrphData.getTotalCountAllHotSpotThreads();
        reportBuffer += agentConfReader.RECORD_SEPRATOR_SPACE;

        //Number of New Hotspot Threads
        reportBuffer += asGrphData.getTotalCountNewHotSpotThreads();
        reportBuffer += agentConfReader.RECORD_SEPRATOR_SPACE;
        reportBuffer += asGrphData.getAvgTimeNewHotSpotThreads();
        reportBuffer += agentConfReader.RECORD_SEPRATOR_SPACE;
        reportBuffer += asGrphData.getMinTimeNewHotSpotThreads();
        reportBuffer += agentConfReader.RECORD_SEPRATOR_SPACE;
        reportBuffer += asGrphData.getMaxTimeNewHotSpotThreads();
        reportBuffer += agentConfReader.RECORD_SEPRATOR_SPACE;
        reportBuffer += asGrphData.getTotalCountNewHotSpotThreads();
        reportBuffer += agentConfReader.RECORD_SEPRATOR_SPACE;
        reportBuffer += "0 0 0 0 0";
        reportBuffer += '\n';

        if (agentConfReader.isToInstrument && agentConfReader.autoSensorConnHandler) {
            samples.toBuffer(reportBuffer)
        }
    }
    catch(err)
    {
        util.logger.warn("Error occur in Dumping 53 record in ASMonitor File here ,record format is :"+ reportBuffer +"  Exp is : "+err);
    }

}
ASDataMonitor.sendHotSpotRecord = function(stack,duration,threadStarttime,flowpathid,methodId,threadID,timestamp) {

    try {
        reportBuffer = "52,";
        reportBuffer += agentConfReader.tierID;
        reportBuffer += agentConfReader.RECORD_SEPRATOR_COMMA;
        reportBuffer += agentConfReader.serverID;
        reportBuffer += agentConfReader.RECORD_SEPRATOR_COMMA;
        reportBuffer += agentConfReader.appID;
        reportBuffer += agentConfReader.RECORD_SEPRATOR_COMMA;
        reportBuffer += threadID;
        reportBuffer += agentConfReader.RECORD_SEPRATOR_COMMA;
        reportBuffer += agentConfReader.THREAD_NAME;
        reportBuffer += agentConfReader.RECORD_SEPRATOR_COMMA;
        reportBuffer += parseInt(threadStarttime / 1000);
        reportBuffer += agentConfReader.RECORD_SEPRATOR_COMMA;
        reportBuffer += duration;
        reportBuffer += agentConfReader.RECORD_SEPRATOR_COMMA;
        reportBuffer += "1"; //1 because we have single thread so it will be in continue mode.
        reportBuffer += agentConfReader.RECORD_SEPRATOR_COMMA;
        reportBuffer += agentConfReader.THREAD_STATE;
        reportBuffer += agentConfReader.RECORD_SEPRATOR_COMMA;
        reportBuffer += agentConfReader.THREAD_PRIORITY;   //thread priority
        reportBuffer += agentConfReader.RECORD_SEPRATOR_COMMA;
        reportBuffer += "5";   //Stack depth
        reportBuffer += agentConfReader.RECORD_SEPRATOR_COMMA;
        reportBuffer += "0,0,";
        reportBuffer += flowpathid + ",";

        //If cavEpocDiff is coming 0, than do not send in seconds, send in original as it is in ms - to fix compatibility issue
        // if(Server.changeOriginalTime) {
        //current time stamp from cavisson epoc time  in seconds (earlier it was in ms)
        reportBuffer += parseInt(timestamp / 1000);
        reportBuffer += agentConfReader.RECORD_SEPRATOR_COMMA;
        reportBuffer += agentConfReader.FUTURE_FIELDS;

        if (stack != undefined && stack != "") {
            for (var i = 0; i < stack.length; i++) {
                if(stack[i].indexOf('netjsagent') !== -1 ||stack[i] == 'Error') {
                    continue
                }
                if (stack[i].indexOf("(") > -1) {
                    reportBuffer += stack[i].replace("at", "").trim();
                }
                else {
                    var ne = "["+ stack[i].replace("at", "").trim() +"](" + stack[i].replace("at", "").trim() + ")"; //If No method found than appending unknown calss and unknow method ,eg:at /home/netstorm/Controller_harendra/nsecom-master/routes/checkOutAndPlaceOrder.js:431:254
                    reportBuffer += ne;
                }
                if (i + 1 !== stack.length)
                    reportBuffer += "|";
            }
        }
        else {
            reportBuffer += "-";
        }
        reportBuffer += '\n';

        //Record format is : 52,2,5,8,696,cav node js:Thread,1476351888732,5,1,Running,5,5,0,0,0,1476351889232,0,0,0,0,0,StackTrace

        if (agentConfReader.isToInstrument && agentConfReader.autoSensorConnHandler) {
            samples.toBuffer(reportBuffer)
        }
    }
    catch (err)
    {
        util.logger.warn("Error occur in Dumping 52 record in ASMonitor File...  : "+err);
    }
}
module.exports = ASDataMonitor;
