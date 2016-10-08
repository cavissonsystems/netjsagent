/**
 * Created by Harendra Kumar on 10/7/2016.
 */

var agentConfReader = require("../agent-setting");
//var asModel = require("./autoSensorDataModel");
var reportBuffer;
var isNewMonitorRecordEnabled = false;

function ASDataMonitor()
{

}
ASDataMonitor.setMonitorEnabledForID = function (backendMonitorvalue) {
    if(Number(backendMonitorvalue) > 0){
        isNewMonitorRecordEnabled = true;
    }
    else {
        isNewMonitorRecordEnabled = false;
    }
    
}
ASDataMonitor.sendThreadSummaryReport = function(){

    try
    {
       /* if(isNewMonitorRecordEnabled)
        {
            reportBuffer += "53,";
            reportBuffer += vectrPrefix_ID;
            reportBuffer += "1";
            reportBuffer += ':';
            reportBuffer += vectrPrefix;
            reportBuffer += '|';
            reportBuffer += totaNumOfThreads;
            reportBuffer += ' ';
            reportBuffer += asGrphData.getTotalCountAllHotSpotThreads();
            reportBuffer += ' ';

            // All Hotspot Threads Duration (Secs)
            reportBuffer += asGrphData.getAvgTimeAllHotSpotThreads();
            reportBuffer += ' ';
            reportBuffer += asGrphData.getMinTimeAllHotSpotThread();
            reportBuffer += ' ';
            reportBuffer += asGrphData.getMaxTimeAllHotSpotThread();
            reportBuffer += ' ';
            reportBuffer += asGrphData.getTotalCountAllHotSpotThreads();
            reportBuffer += ' ';

            //Number of New Hotspot Threads
            reportBuffer += asGrphData.getTotalCountNewHotSpotThreads();
            reportBuffer += ' ';

            // Number of New Hotspot Threads
            reportBuffer += asGrphData.getAvgTimeNewHotSpotThreads();
            reportBuffer += ' ';
            reportBuffer += asGrphData.getMinTimeNewHotSpotThreads();
            reportBuffer += ' ';
            reportBuffer += asGrphData.getMaxTimeNewHotSpotThreads();
            reportBuffer += ' ';
            reportBuffer += asGrphData.getTotalCountNewHotSpotThreads();
            reportBuffer += ' ';

           /!* if(asSettings.getThreadStateReport() > 0)
            {
                reportBuffer += ' ';
                reportBuffer += asGrphData.getNumOfBlockedThreads();
                reportBuffer += ' ';
                reportBuffer += asGrphData.getNumOfRunnableThreads();
                reportBuffer += ' ';
                reportBuffer += asGrphData.getNumOfTimedWaitingThreads();
                reportBuffer += ' ';
                reportBuffer += asGrphData.getNumOfWaitingThreads();
                reportBuffer += ' ';
                reportBuffer += asGrphData.getNumOfTerminatedThreads();
            }
            else*!/
            //{
                reportBuffer += ",0,0,0,0,0,0";
            //}

            reportBuffer += '\n';
        }
        else
        {
            reportBuffer += "51,";
            reportBuffer += NDSy.getTierID();
            reportBuffer += ",";
            reportBuffer += NDSy.getAppServerID();
            reportBuffer += ",";
            reportBuffer += NDSy.getAppID();
            reportBuffer += ",";
            reportBuffer += totaNumOfThreads;
            reportBuffer += ",";
            reportBuffer += asGrphData.getTotalCountAllHotSpotThreads();
            reportBuffer += ",";
            reportBuffer += asGrphData.getAvgTimeAllHotSpotThreads();
            reportBuffer += ",";
            reportBuffer += asGrphData.getMinTimeAllHotSpotThread();
            reportBuffer += ",";
            reportBuffer += asGrphData.getMaxTimeAllHotSpotThread();
            reportBuffer += ",";
            reportBuffer += asGrphData.getTotalCountNewHotSpotThreads();
            reportBuffer += ",";
            reportBuffer += asGrphData.getAvgTimeNewHotSpotThreads();
            reportBuffer += ",";
            reportBuffer += asGrphData.getMinTimeNewHotSpotThreads();
            reportBuffer += ",";
            reportBuffer += asGrphData.getMaxTimeNewHotSpotThreads();
           /!* if(asSettings.getThreadStateReport() > 0)
            {
                reportBuffer += ",";
                reportBuffer += asGrphData.getNumOfBlockedThreads();
                reportBuffer += ",";
                reportBuffer += asGrphData.getNumOfRunnableThreads();
                reportBuffer += ",";
                reportBuffer += asGrphData.getNumOfTimedWaitingThreads();
                reportBuffer += ",";
                reportBuffer += asGrphData.getNumOfWaitingThreads();
                reportBuffer += ",";
                reportBuffer += asGrphData.getNumOfTerminatedThreads();
            }
            else
            {*!/
                reportBuffer += ",0,0,0,0,0,0";
           // }

            reportBuffer += '\n';
        }*/
    }
    catch(err)
    {
    }

}
ASDataMonitor.sendHotSpotRecord = function(stack,duration,start,flowpathid,threadID,timestamp) {

    //asModel.setHotSpotDuration(duration,"");
    reportBuffer = "52,";
    reportBuffer += agentConfReader.tierID;
    reportBuffer += ",";
    reportBuffer += agentConfReader.serverID;
    reportBuffer += ",";
    reportBuffer += agentConfReader.appID;
    reportBuffer += ",";
    reportBuffer += threadID;
    reportBuffer += ",";
    reportBuffer += start;
    reportBuffer += ",";
    reportBuffer += duration;
    reportBuffer += ",";
    reportBuffer += "1/0"; //isContinue;
    reportBuffer += ",";
    reportBuffer += "Running";
    reportBuffer += ",";
    reportBuffer += "ThreadPriority";
    reportBuffer += ",";
    reportBuffer += "ThreadStackDepth";
    reportBuffer += ",";
    reportBuffer += "0,0,";
/*    if(2 == asSettings.getEnableFPInSummaryReport())
    {
        //Pulling LOGIC
        if(asSettings.isASEnableFPInSummaryReport())
        {
            var s = NDSys.BCIFlowpathInstanceIDMap.get(curObj.ThreadID);
            if(null != s)
            {
                reportBuffer += "s";
                reportBuffer += ",";
            }
            else
            {
                reportBuffer += "0,";
            }
        }
        else
        {
            //The flowpathInstanceInSummary report is not enabled
            reportBuffer += "0,";
        }
        //PULLING LOGIC Ends here
    }
    else if(1 == asSettings.getEnableFPInSummaryReport())
    {
        //PUSHING Logic
        if(null != curObj.flowPathInstanceID)
        {
            reportBuffer += "curObj.flowPathInstanceID";
            reportBuffer += ",";
        }
        else
        {
            reportBuffer += "0,";
        }
        //PUSHING Logic
    }
    else
    {*/
        //disabling enableFPInSummaryReport
        reportBuffer += "0,";
  //  }

    //If cavEpocDiff is coming 0, than do not send in seconds, send in original as it is in ms - to fix compatibility issue
   // if(Server.changeOriginalTime) {
        //current time stamp from cavisson epoc time  in seconds (earlier it was in ms)
        reportBuffer += timestamp/ 1000;
        reportBuffer += ",";
   // }
   /* else {
        reportBuffer += timeStamp;
        reportBuffer += ",";
    }*/

    reportBuffer += "0,0,0,0,";

    /* for(var i = 0; i < curObj.stackTraceElements.length; i++)
     {
     reportBuffer += (curObj.stackTraceElements[i]); // Assumption is no comma
     if(i < (curObj.stackTraceElements.length - 1)) // Append pipe for all except after last
     reportBuffer += "|";
     }*/

    reportBuffer += '\n';

    agentConfReader.autoSensorConnHandler.write(reportBuffer);
}
module.exports = ASDataMonitor;