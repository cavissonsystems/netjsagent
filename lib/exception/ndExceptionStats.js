/**
 * Created by Siddhant on 28-11-2016.
 */


var StringBuffer = require('../flowpath/StringBuffer').StringBuffer;
var samples = require('../nodetime/lib/samples.js');
var ndExceptionManager = require('./ndExceptionManager');
var ndExceptionMonitor = require('./ndExceptionMonitor');
var ndExceptionCaptureSettings = require('./ndExceptionCaptureSettings');
var util = require('../util');
var AgentSetting = require('../agent-setting');

function ndExceptionStats() {

}


ndExceptionStats.EXCEPTION_CLASS_RECORD_ID = 32;
ndExceptionStats.THROWING_CLASS_RECORD_ID = 33;
ndExceptionStats.THROWING_METHOD_RECORD_ID = 34;
ndExceptionStats.EXCEPTION_MESSAGE_RECORD_ID = 35;
ndExceptionStats.EXCEPTION_CAUSE_RECORD_ID = 36;
ndExceptionStats.STACK_TRACE_RECORD_ID = 37;

/**
 * It maps exception class with its id. will be used to dump meta record for exception class.
 */
var exceptionClassIdMap = new Object();

/**
 * It maps throwing class with its id. will be used to dump meta record for throwing class.
 */
var throwingClassIdMap = new Object();

/**
 * It maps throwing method with its id. will be used to dump meta record for throwing method.
 */
var throwingMethodIdMap = new Object();

/**
 * It maps exception message with its id. will be used to dump meta record for exception message.
 */
var exceptionMessageIdMap = new Object();

/**
 * It maps exception cause with its id. will be used to dump meta record for exception cause.
 */
var exceptionCauseIdMap = new Object();

/**
 * It maps stack trace array object with its id. will be used to dump meta record for stack trace.
 */
var stackTraceIdMap = new Object();

var exceptionClassId = 0; // This id is used to identify exception class.
var throwingClassId = 0; // This id is used to identify throwing class.
var throwingMethodId = 0; // This id is used to identify throwing method.
var exceptionMessageId = 0; // This id is used to identify exception message.
var exceptionCauseId = 0; // This id is used to identify exception cause.
var stackTraceId = 0; // This id is used to identify stack trace.
//private static int exceptionCaptureTraceLevel = NDSettings.ndExceptionCaptureSettings.getExceptionCaptureTraceLevel();
var exceptionFilterList = new Object(); // This id is used to identify stack trace.


ndExceptionStats.dumpExceptionRecord = function (compArgs) {
    //backend name id will be send as -1 in the default case,
    //sequence number will be 0 in the default case.
    //backend type will be -1 in the default case.
    //backend subtype will be -1 in the default case.
    //console.log("ndExceptionCaptureSettings.getExceptionType() is : ",ndExceptionCaptureSettings.getExceptionType());
    //if(ndExceptionCaptureSettings.getExceptionType() == 1) // 1 means for all type of exception handled and unhandled.
    ndExceptionStats.handleCapturingAndMonitoringType(compArgs, -1, 0, -1, -1);
}

ndExceptionStats.handleCapturingAndMonitoringType = function (compArgs, backendId, seqNumber, type, subtype) {
    try {
        if (!ndExceptionMonitor.isMonitoringEnabled && (ndExceptionCaptureSettings.getExceptionCaptureMode() > 0)) {
            ndExceptionStats.handleExceptionParameters(compArgs, backendId, seqNumber, type, subtype);
        }
        else if ((ndExceptionCaptureSettings.getExceptionCaptureMode() == 0) && ndExceptionMonitor.isMonitoringEnabled) {
            ndExceptionStats.handleOnlyMonitoringCase(compArgs);
        }
        else {
        ndExceptionStats.handleExceptionParameters(compArgs, backendId, seqNumber, type, subtype);
        }
    }
    catch (err) {
	util.logger.warn("Exception occured in dumpExceptionRecord....."+err);
    }
}

ndExceptionStats.handleOnlyMonitoringCase = function(comArgs)
{
    var throwableObj = comArgs.error;

    if(null == throwableObj)
    {
        util.logger.warn("NDExceptionStats: Returning as Throwable object is found null");
        return;
    }

    var exceptionClassName = throwableObj.name;
    var exceptionMessage = throwableObj.message;

    //filter out exception class names, which are specified by user in ndExceptionFilterList
    if(ndExceptionStats.checkIfFilteringIsEnabled())
    {
        for(var i = 0; i < ndExceptionStats.exceptionFilterList.length; i++)
        {
            if(exceptionClassName == ndExceptionStats.exceptionFilterList[i].toString())
            {
              util.logger.warn("Current exception class is specified in filterList, so ignoring for processing.Exception class: " + exceptionClassName + " filter element : " + exceptionFilterList[i]);
                return;
            }
        }
    }

    var id = ndExceptionStats.getIDAndDumpExceptionClassName(exceptionClassName);
    try {
        ndExceptionMonitor.updateCumCount(id, exceptionClassName);
    }catch(err){
        util.logger.warn(err);
    }
}


ndExceptionStats.handleExceptionParameters = function (compArgs, backendId, seqNumber, type, subtype) {
     //We need to check weather monitoring is enabled we need to capture exceptions
    try {
        var throwableObj = compArgs.error;
        if (!throwableObj) {
            util.logger.warn("NDExceptionStats: Returning as Throwable object is found null");
                return;
        }

        var exceptionClassName = throwableObj.name;
        var exceptionMessage = throwableObj.message;
        // If exception is Throwable and corresponding exception message is null,
        // it means an empty Throwable is created and the object is of no use.

        if(ndExceptionStats.checkIfFilteringIsEnabled())
        {
            for(var i = 0; i < ndExceptionStats.exceptionFilterList.length; i++)
            {
                if(exceptionClassName == ndExceptionStats.exceptionFilterList[i].toString())
                {
                    util.logger.warn("Current exception class is specified in filterList, so ignoring for processing.Exception class: " + exceptionClassName + " filter element : " + exceptionFilterList[i]);
                    return;
                }
            }
        }

        var id = ndExceptionStats.getIDAndDumpExceptionClassName(exceptionClassName);
        ndExceptionMonitor.updateCumCount(id, exceptionClassName);

        var stack = throwableObj.stack;
        var stackTraceArr = ndExceptionStats.parseStack(stack);

        if ((!stackTraceArr) || (stackTraceArr.length == 0)) {
              util.logger.warn("NDExceptionStats: Returning as stack trace is not found");
                return;
        }

        var exceptionClassId = ndExceptionStats.getIDAndDumpExceptionClassName(exceptionClassName);
        var throwingClassName = compArgs.entryData.file;
        var throwingClassId = ndExceptionStats.getIDAndDumpThrowingClassName(throwingClassName);
        var throwingMethodName = compArgs.entryData.name;
        var throwingMethodId = ndExceptionStats.getIDAndDumpThrowingMethodName(throwingMethodName);

        // if exception message is null, then this id will not be set. At the time of dumping we check if it is -1, we do not dump the id.
        var exceptionMessageId = -1;
        if (exceptionMessage)
            exceptionMessageId = ndExceptionStats.getIDAndDumpExceptionMessage(exceptionMessage);

        // if exception cause is null, then this id will not be set. At the time of dumping we check if it is -1, we do not dump the id.
        var exceptionCauseId = -1;
        /*if(NDSettings.ndExceptionCaptureSettings.getExceptionCauseCaptureMode() == 1)
         {
         if(null != throwableObj.getCause())
         {
         var exceptionCause = throwableObj.getCause().toString(); // TODO: getCause returns throwable object, toString is costly.
         exceptionCauseId = getIDAndDumpExceptionCause(exceptionCause);
         }
         }
         else
         {
         if(NDSettings.ndExceptionCaptureSettings.getExceptionCaptureTraceLevel() > 3)
         NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDExceptionStats: not capturing exception cause, as capturing of cause is disable.");
         }*/

        // generates the 38 record, which contains all the mapping ids for all exception records collecting so far and dumps the record.
        ndExceptionStats.dumpExceptionRecords(compArgs, exceptionClassId, throwingClassId, throwingMethodId, exceptionMessageId, exceptionCauseId, stackTraceArr, backendId, seqNumber, type, subtype);
    }catch(err){
        console.log(err);
    }
}

ndExceptionStats.dumpExceptionRecords = function (compArgs, exceptionClassId, throwingClassId, throwingMethodId, exceptionMessageId, exceptionCauseId, stackTraceArr, backendId, seqNumber, type, subtype) {
    var startTime = parseInt(compArgs.entryData.flowPathObj.timeInMillis/1000);
    var flowPathId = compArgs.entryData.flowPathObj.flowPathId;
    var lineNumber = compArgs.entryData.line;

    try {

        var sb = new StringBuffer();
        //38 record is for exceptions occurred in integration points it requires backendType and sequence number in exception record
        sb.add("38,");
        sb.add(flowPathId);
        sb.add(',');
        sb.add(startTime);
        sb.add(',');

        sb.add(backendId);
        sb.add(',');
        sb.add(seqNumber);
        sb.add(',');

        sb.add(type);
        sb.add(',');
        sb.add(subtype);
        sb.add(',');

        sb.add(exceptionClassId);
        sb.add(',');
        sb.add(throwingClassId);
        sb.add(',');
        sb.add(throwingMethodId);
        sb.add(',');
        sb.add(lineNumber);

        sb.add(',');
        if (exceptionMessageId != -1) // if exception message is null, then its id will be set to -1.
            sb.add(exceptionMessageId);

        sb.add(',');
        if (exceptionCauseId != -1) // if exception cause is null, then its id will be set to -1.
            sb.add(exceptionCauseId);

        sb.add(',');
	sb.add(stackTraceArr);


        var record = sb.toString() + "\n";

        samples.add(record);
    }
    catch (err)
    {
        util.logger.warn("dumpExceptionRecords", "Exception occured in dumpExceptionRecords.....", err);
    }
}

/**
 * This method checks for the exceptionClassName id in the map.
 * If Id is found, returns the id.
 * If id is not found generate the id, put it in the map and returns the id.
 * @param exceptionClassName
 * @return
 */
ndExceptionStats.getIDAndDumpExceptionClassName = function (exceptionClassName) {
    var Id = -1;
    var exceptionClassNameID = exceptionClassIdMap[exceptionClassName];
    if (exceptionClassNameID) {
        Id = parseInt(exceptionClassNameID);
        return Id;
    }

    Id = ++exceptionClassId;
    exceptionClassIdMap[exceptionClassName] = exceptionClassId;

    ndExceptionStats.dumpExceptionMetaRecord(ndExceptionStats.EXCEPTION_CLASS_RECORD_ID, exceptionClassName, Id);
    return Id;
}

/**
 * dumps meta record in following format:
 * 32,<ExceptionClassID>,<FQ Class Name>
 * 33,<ExceptionThrowingClassID>,<FQ Class Name>
 * 34,<ExceptionThrowingMethodID>,<Method Name>
 * 35,<ExceptionMessageID>,<Message String>
 * 36,<ExceptionCauseID>,<Cause String>
 * 37,<ExceptionStackTraceID>,<StackTrace String>
 * @param recordId
 * @param exceptionRecord
 * @param exceptionStatId
 */
ndExceptionStats.dumpExceptionMetaRecord = function (recordId, exceptionRecord, exceptionStatId) {
    try {
        var sb = new StringBuffer();
        sb.add(recordId);
        sb.add(',');
        sb.add(exceptionStatId);
	    sb.add(',');
        sb.add(exceptionRecord);

        var record = sb.toString() + "\n";

        samples.add(record);
    }
    catch (err)
    {
        util.logger.warn(AgentSetting.currentTestRun, "NDExceptionStats", "dumpExceptionMetaRecord", "Exception occured in dumpExceptionMetaRecord.....", err);
    }
}

/**
 * This method checks for the throwingClassName id in the map.
 * If Id is found, returns the id.
 * If id is not found generate the id, put it in the map and returns the id.
 * @param throwingClassName
 * @return
 */
ndExceptionStats.getIDAndDumpThrowingClassName = function (throwingClassName) {
    var Id = -1;
    var throwingClassNameID = throwingClassIdMap[throwingClassName];
    if (null != throwingClassNameID) {
        Id = parseInt(throwingClassNameID);

        return Id;
    }

    Id = ++throwingClassId;
    throwingClassIdMap[throwingClassName] = throwingClassId;

    ndExceptionStats.dumpExceptionMetaRecord(ndExceptionStats.THROWING_CLASS_RECORD_ID, throwingClassName, Id);
    return Id;
}

/**
 * This method checks for the throwingMethodName id in the map.
 * If Id is found, returns the id.
 * If id is not found generate the id, put it in the map and returns the id.
 * @param throwingMethodName
 * @return
 */
ndExceptionStats.getIDAndDumpThrowingMethodName = function (throwingMethodName) {
    var Id = -1;
    var throwingMethodNameID = throwingMethodIdMap[throwingMethodName];
    if (throwingMethodNameID) {
        Id = parseInt(throwingMethodNameID);
        return Id;
    }

    Id = ++throwingMethodId;
    throwingMethodIdMap[throwingMethodName] = throwingMethodId;

    ndExceptionStats.dumpExceptionMetaRecord(ndExceptionStats.THROWING_METHOD_RECORD_ID, throwingMethodName, Id);
    return Id;
}

/**
 * This method checks for the exceptionMessage id in the map.
 * If Id is found, returns the id.
 * If id is not found generate the id, put it in the map and returns the id.
 * @param exceptionMessage
 * @return
 */
ndExceptionStats.getIDAndDumpExceptionMessage = function (exceptionMessage) {
    var Id = -1;
    var exceptionMessageID = exceptionMessageIdMap[exceptionMessage];
    if (exceptionMessageID) {
        Id = parseInt(exceptionMessageID);

        return Id;
    }

    Id = ++exceptionMessageId;
    exceptionMessageIdMap[exceptionMessage] = exceptionMessageId;

    ndExceptionStats.dumpExceptionMetaRecord(ndExceptionStats.EXCEPTION_MESSAGE_RECORD_ID, exceptionMessage, Id);
    return Id;
}

/**
 * A method which will check and return value of exception filtering is enabled or disabled
 * @return
 */
ndExceptionStats.checkIfFilteringIsEnabled = function()
{
    return ndExceptionStats.isFilteringEnabled;
}

ndExceptionStats.parseStack = function(stackTraceArr){

        if (stackTraceArr) {
            var stack = stackTraceArr.split("\n");
	    var reportBuffer='';
	for(i in stack){
                if(stack[i].indexOf('netjsagent') !== -1 ||stack[i].trim().startsWith('Error')) {
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
                    reportBuffer += "%7C";

	}
	return reportBuffer;
        }
}

module.exports = ndExceptionStats;
