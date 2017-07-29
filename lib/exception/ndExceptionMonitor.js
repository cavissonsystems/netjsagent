/**
 * Created by Siddhant on 05-12-2016.
 */
var NDExceptionData = require('./ndExceptionData');
var AgentSetting = require("../agent-setting");
var util = require('./../util');

function ndExceptionMonitor (){};

ndExceptionMonitor.isMonitoringEnabled = false;
ndExceptionMonitor.traceLevel;
ndExceptionMonitor.exceptionFilterList = [];
ndExceptionMonitor.isFilteringEnabled = false;
/**
 * Map of all http conditions which are present in current list for monitoring in current  test
 */
ndExceptionMonitor.currentMonitoringExceptionList = new Object();

/**
 * To keep all the data model objects ( initially default models, later after the execution of threads with updated datas) for every exceptions (executed by every threads) inside an arrayList of model objects
 */
ndExceptionMonitor.exceptionMonitoringModelList = [100];

/**
 * Count of reporting after which the threadCheckup will be done to identify non-live threads using stored flag and API
 */
ndExceptionMonitor.checkThreadCleanUpCount = 0; //count for cleaning dead threads

ndExceptionMonitor.vectorPrefix = "NA"; //count for cleaning dead threads

ndExceptionMonitor.vectorPrefix_ID = "NA"; //count for cleaning dead threads
var AgentSetting = require("../agent-setting");
var exceptionMonTimer= undefined;
var ignoreDisplayName = false;

var tlMonitoredExceptionDataObjList = new Object();

ndExceptionMonitor.clearExceptionMonList = function(){
    ndExceptionMonitor.currentMonitoringExceptionList = new Object();
};

ndExceptionMonitor.clearExceptionMonMap = function() {
    tlMonitoredExceptionDataObjList = new Object();
}

ndExceptionMonitor.startExceptionMonitor = function()
{
    try {
        if (AgentSetting.isTestRunning && AgentSetting.agentMode >= 2) {
	        if(exceptionMonTimer === undefined)
            	exceptionMonTimer = setInterval(ndExceptionMonitor.dumpExceptionMonitor, AgentSetting.ndMonitorInterval);
        }
        else
            ndExceptionMonitor.stopExceptionMonitor();
    }
    catch(err){util.logger.warn(err)}
}

ndExceptionMonitor.stopMethodMonitor = function()
{
    try{
        clearInterval(exceptionMonTimer);
    }
    catch(err){util.logger.warn(err)}
}

ndExceptionMonitor.dumpExceptionMonitor =  function()
{
    if(!ndExceptionMonitor.isMonitoringEnabled)
        return ;

    var vectorPrefix = AgentSetting.tier + AgentSetting.ndVectorSeparator + AgentSetting.server + AgentSetting.ndVectorSeparator + AgentSetting.instance + AgentSetting.ndVectorSeparator;
    var vectorPrefixID = AgentSetting.tierID + "|" + AgentSetting.appID + "|";

    try {
        var overall_cumcount = 0;  //for overall cumcount
        var overall_invocationCount = 0;		//for all invocationcount
        //looping till the end of the array to get all the objects methods for monitoring
        var keys = Object.keys(tlMonitoredExceptionDataObjList);
        if (keys.length) {
            for (var i in keys) {
                var eId = keys[i];
                var exceptionData = tlMonitoredExceptionDataObjList[keys[i]];
                var aliasName = ndExceptionMonitor.currentMonitoringExceptionList[exceptionData.exceptionClassName]
                if(!aliasName)
                    continue;

                var cumCount = 0;
                var invocationCount = 0; // Total number of invocations from all threads for the sample period
                var rate;

                cumCount += exceptionData.cumCount;
                overall_cumcount += exceptionData.cumCount;

                invocationCount += exceptionData.cumCount - exceptionData.prevCumCount;
                overall_invocationCount += exceptionData.cumCount - exceptionData.prevCumCount;
		        rate = (invocationCount / parseInt(AgentSetting.ndMonitorInterval / 1000));
                var data = ndExceptionMonitor.createExceptionData(vectorPrefixID, eId, vectorPrefix, aliasName, cumCount, rate);
                AgentSetting.autoSensorConnHandler.write(data);

                exceptionData.init();


            }//END OF LOOPING THE MODEL ARRAY LIST - for all methods (accessed by all threads - inner collection)

            var overall_rate = (overall_invocationCount / parseInt(AgentSetting.ndMonitorInterval / 1000));
            //Dumping over_all record for exception

            var data = ndExceptionMonitor.createExceptionData(vectorPrefixID, 0, vectorPrefix, 'OverAll', overall_cumcount, overall_rate);
            AgentSetting.autoSensorConnHandler.write(data);

        }
    }
    catch(e)
    {
        return false;
    }
}

ndExceptionMonitor.createExceptionData = function(vectorPrefixID, eId, vectorPrefix, aliasName, cumCount, rate){
    var sb = '';
    sb+=("63,");
    sb+= vectorPrefixID;//getting TierID, InstanceID
    sb+= eId;
    sb+= ':';

    sb+= vectorPrefix;
    sb+= aliasName ;
    sb+= '|'
    sb+= cumCount;
    sb+= ' '
    sb+= rate
    sb+= ' '
    sb+= '\n';

    return sb;
}

ndExceptionMonitor.parseExceptionMonitoringList = function(exceptionMonList){
    try {
        try {
            ndExceptionMonitor.currentMonitoringExceptionList={}
            if((!exceptionMonList) || (exceptionMonList.length == 0)){
                ndExceptionMonitor.isMonitoringEnabled = false;
                return;
            }
            for(var j in exceptionMonList) {
                var currLine = exceptionMonList[j];

                // if line is commented or blank skip that line
                if (currLine.trim().startsWith("#") || !currLine)
                    continue;

                //<AliasName>|<Exception name String>|<Future1>|<Future2>|<Future3>|<Future4>|<Comments>
                //atg|atg.repository.rql.RqlParser$LookaheadSuccess|||||atg related exception
                var allFields = currLine.toString().trim().split("|");
                var exceptionClassName,
                    displayName = "";
                if (allFields.length > 1) {
                    exceptionClassName = allFields[1].toString();
                    if (null == exceptionClassName)
                        continue;
                    displayName = allFields[0].toString();
                }
                else
                    continue;

                var aliasName = ndExceptionMonitor.currentMonitoringExceptionList[exceptionClassName]
                if (!aliasName) {
                    if (!displayName)
                        ndExceptionMonitor.currentMonitoringExceptionList[exceptionClassName] = exceptionClassName;
                    else
                        ndExceptionMonitor.currentMonitoringExceptionList[exceptionClassName] = displayName
                }
                else
                    util.logger.warn(AgentSetting.currentTestRun+" |parseExceptionMonitoringList| Duplicate Exception monitoring element found, Already present in currentMonitoringList. Element : " + exceptionClassName + ". Ignoring this...");
            }

        }
        catch(err) {
            util.logger.warn(AgentSetting.currentTestRun+" | ndExceptionMonitor", "parseExceptionMonitoringList", "Error occured.", err);
        }

        //ndExceptionMonitor.createAddAndRemoveMonitoringList();
        /*if(ndExceptionMonitor.removedMonitoringExceptionList.size() > 0)
        {
            ndExceptionMonitor.manageRemovedMonitoringExceptions();
            if(Server.isRuntimeApplied)
                sendDelectedVectorList();
        }
        if(ndExceptionMonitor.addedMonitoringExceptionList.size() > 0)
        {
            /!*if(Server.isRuntimeApplied)
             sendAddedVectorList();*!/
            ndExceptionMonitor.manageAddedMonitoringExceptions();
        }*/
    }
    catch(err) {
        util.logger.warn(AgentSetting.currentTestRun+" |ndExceptionMonitor", "parseExceptionMonitoringList", "Exception occured in parsing monitoringlist of exceptions.", err);
    }

    var lengthOfcurrentMonitoringExceptionList = Object.keys(ndExceptionMonitor.currentMonitoringExceptionList).length;
    if(lengthOfcurrentMonitoringExceptionList > 0)
        ndExceptionMonitor.isMonitoringEnabled = true;
    else
        ndExceptionMonitor.isMonitoringEnabled = false;

}

ndExceptionMonitor.updateCumCount = function (exID, exceptionClassName) {
    try {
        var ndEMData = tlMonitoredExceptionDataObjList[exID];
        if (null == ndEMData) {
            ndEMData = new NDExceptionData(exID,exceptionClassName);
            tlMonitoredExceptionDataObjList[exID] = ndEMData;
        }
        ndEMData.updateCumulativeCount();
    }
    catch (err) {
        util.logger.warn(AgentSetting.currentTestRun+" |ndExceptionMonitor", "updateCumCount", "updateCumCount method completed, exception className " + exceptionClassName, err);
    }
}

ndExceptionMonitor.stopExceptionMonitor = function()
{
    try{
        clearInterval(exceptionMonTimer);
	exceptionMonTimer = undefined;
    }
    catch(err){util.logger.warn(err)}
}
module.exports = ndExceptionMonitor;
