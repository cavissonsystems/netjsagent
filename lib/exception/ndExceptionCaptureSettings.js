/**
 * Created by Siddhant on 02-12-2016.
 */

var ndExceptionMonitor = require('./ndExceptionMonitor');
var agentConfReader = require("../agent-setting");
var util = require('../util');

var exceptionCaptureMode = 0; // exception capture mode - 0 1, by default 0 (disable)
var stackTraceCaptureMode = 0; // stack trace capture mode - 0 1, by default 0 (disable)
var exceptionCauseCaptureMode = 0; // exception cause capture mode - 0 1, by default 0 (disable)
var exceptionType = 0; // stack trace is dumped as value(0) or as ID(1)
var stackTraceMaxDepth = 9999; // maximum stack trace depth upto which the stack is dumped
var exceptionCaptureTraceLevel = 0; // variable for logging exception related information

function ndExceptionCaptureSettings() {};

ndExceptionCaptureSettings.parseExceptionCaptureSettings = function (clientMsg) {
    var wholeArgs = clientMsg.split(";"); // only supported from NDC side. Can not give at JVM load time.
    if (clientMsg.indexOf("ndExceptionFilterList") == -1) {
        ndExceptionMonitor.exceptionFilterList =[];
        ndExceptionMonitor.isFilteringEnabled = false;
    }

    for (var i in wholeArgs) {
        if(!wholeArgs[i])
            continue
        ndExceptionCaptureSettings.setExceptionCapturedArguments(wholeArgs[i]);
    }
};

ndExceptionCaptureSettings.setExceptionCapturedArguments = function (keyValue) {
    var keywordAndValue = keyValue.split("=");
    if (keywordAndValue[0] == "captureExceptionTraceLevel") {
        ndExceptionCaptureSettings.setExceptionCaptureTraceLevel(keywordAndValue[1]);
    }else if (keywordAndValue[0] == "instrExceptions") {
        ndExceptionCaptureSettings.setExceptionCaptureSettings(keywordAndValue[1]);
    }else if (keywordAndValue[0] == "ndExceptionFilterList") {
        ndExceptionCaptureSettings.parseExceptionFilteringList(keywordAndValue[1])
    }
}

ndExceptionCaptureSettings.setExceptionCaptureTraceLevel = function (strKeywordValue) {
    try {
        if (strKeywordValue != null) {
            var temp = parseInt(strKeywordValue);
            if (temp >= 0 && temp <= 10) {
                exceptionCaptureTraceLevel = temp;

                ndExceptionMonitor.traceLevel = exceptionCaptureTraceLevel;
                return true;
            }
            else
                return false;
        }
        else {
            return false;
        }
    }
    catch (err) {
        util.logger.warn(agentConfReader.currentTestRun + " | ndExceptionCaptureSettings", "setExceptionCaptureTraceLevel", "Error in setting exceptionCaptureTraceLevel due to exception " + err + ". Received Value = " + strKeywordValue + ". Previous value will be used. Prev value = " + exceptionCaptureTraceLevel);
        return false;
    }
};

/**
 * Handles and sets accordingly exception related information
 * @param strKeywordValue
 */
ndExceptionCaptureSettings.setExceptionCaptureSettings = function (strKeywordValue) {
    ndExceptionCaptureSettings.setDefaultValues();
    var isValid;                                    // it will decide whether argument is valid or not
    try {
        if (!strKeywordValue)
             util.logger.info(agentConfReader.currentTestRun + " | NDExceptionCaptureSettings: Retrurning without setting ExceptionCaptureSettings, as arguments are not provided.");

        var keywords = strKeywordValue.split("%20");            // fields in the keyword are space separated, hence decoding spaces.
        var numberOfFields = keywords.length;

        isValid = ndExceptionCaptureSettings.setExceptionCaptureMode(keywords[0]);
        if (!isValid)
            return;

        if (exceptionCaptureMode == 0)
            return;

        // if stack trace capturing is off (2nd field), we return without parsing other fields i.e. 3rd and 4th field.
        // But we need to parse 5th field which is capturing exception cause mode.
        if (numberOfFields > 4) {
            isValid = ndExceptionCaptureSettings.setExceptionCauseCaptureMode(keywords[4]);
            if (!isValid) {
                util.logger.info(agentConfReader.currentTestRun + " | NDExceptionCaptureSettings: Returning without setting exceptionCauseCaptureMode, as value is invalid. Default value will be used. Value = " + exceptionCauseCaptureMode + ".")
                return;
            }
        }

        if (numberOfFields > 1) {
            isValid = ndExceptionCaptureSettings.setStackTraceCaptureMode(keywords[1]);
            if (!isValid)
                return;
        }

        if (stackTraceCaptureMode == 0)
            return;

        if (numberOfFields > 2) {
            isValid = ndExceptionCaptureSettings.setExceptionType(keywords[2]);
            if (!isValid) {
                util.logger.info(agentConfReader.currentTestRun + " | NDExceptionCaptureSettings: Returning without setting exceptionCauseCaptureMode, as value is invalid. Default value will be used. Value = " + exceptionType + ".")
                return;
            }
        }

        if (numberOfFields > 3) {
            isValid = ndExceptionCaptureSettings.setStackTraceMaxDepth(keywords[3]);
            if (!isValid) {
                util.logger.info(agentConfReader.currentTestRun + " | NDExceptionCaptureSettings: Returning without setting stackTraceMaxDepth, as value is invalid. Default value will be used. Value = " + stackTraceMaxDepth + ".")
                return;
            }
        }
        return;
    }
    catch (err) {
        util.logger.warn(agentConfReader.currentTestRun + " | NDExceptionCaptureSettings: ",err);
        return;
    }
}

/**
 * sets the default values
 * */
ndExceptionCaptureSettings.setDefaultValues = function () {
    exceptionCaptureMode = 0;
    exceptionCauseCaptureMode = 0;
    stackTraceCaptureMode = 0;
    stackTraceMaxDepth = 9999;
    exceptionType = 0;
};


/**
 * A method which will parse filter list specified by ndExceptionFilterList and will restrict these from capturing and monitoring
 * @param exceptionFilterList
 * @Syntax keyword=<Exception className1 (pattern or FQC)>,<Exception className2 (pattern or FQC)>,<Exception className3 (pattern or FQC)>
 * @Example exceptionFilterList=java.lang.ClassNotFoundException,weblogic.servlet.jsp.AddToMapException,java.io.IOException;
 */
ndExceptionCaptureSettings.parseExceptionFilteringList = function (exceptionFilterList) {
    try {
        if (exceptionFilterList == 'NA') {
            ndExceptionMonitor.setFilteringEnabled = false;
            return;
        }

        ndExceptionMonitor.exceptionFilterList = [];

        var allFilteringExceptions = exceptionFilterList.split(",");

        for (var i = 0; i < allFilteringExceptions.length; i++) {
            var currElement = allFilteringExceptions[i].toString();
            if (!ndExceptionMonitor.exceptionFilterList.indexOf(currElement)>-1) {        //todo check indexOf condition
                ndExceptionMonitor.exceptionFilterList.push(currElement);
            }
        }
    }
    catch (err) {
        console.log(agentConfReader.currentTestRun + " | ndExceptionCaptureSettings", "parseExceptionFilteringList", "Exception occured in parsing filteringlist.", err,err.stack);
    }
    //TO DO=====================================================================
  /*  if (ndExceptionMonitor.exceptionFilterList.size() > 0)
        ndExceptionMonitor.setFilteringEnabled = true;*/
}


/**
 * sets exception capture mode
 * @param exceptionCaptureMode
 * @return
 */
ndExceptionCaptureSettings.setExceptionCaptureMode = function (exceptionCaptureMode1) {
    try {
        if (exceptionCaptureMode1) {
            var temp = parseInt(exceptionCaptureMode1);
            // exception capture mode will have 3 values only:
            // 0-disable, 1-enable for complete flow path only, 2-enable for level one and complete flow path both
            if (temp >= 0 && temp <= 2) {
                exceptionCaptureMode = temp;
                return true;
            }
            else
                return false;
        }
        else
            return false;
    }
    catch (err) {
        util.logger.warn(agentConfReader.currentTestRun + " | ndExceptionCaptureSettings", "setExceptionCaptureMode", "Error in setting exceptionCaptureMode, due to exception = " + err + ". Received value = " + exceptionCaptureMode + ".");
        return false;
    }
}

/**
 * sets exception cause capture mode
 * @param exceptionCauseCaptureMode
 * @return
 */
ndExceptionCaptureSettings.setExceptionCauseCaptureMode = function (exceptionCauseCaptureMode1) {
    try {
        if (exceptionCauseCaptureMode1 != null) {
            var temp = parseInt(exceptionCauseCaptureMode1);
            if (temp == 0 || temp == 1) {
                exceptionCauseCaptureMode = temp;

                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
    catch (err) {
        util.logger.warn(agentConfReader.currentTestRun + " | ndExceptionCaptureSettings", "setExceptionCauseCaptureMode", "Error in setting exceptionCauseCaptureMode, due to exception = " + err + ". Received value = " + exceptionCauseCaptureMode + ".");
        return false;
    }
}

/**
 * sets stack trace capture mode
 * @param stackTraceCaptureMode
 * @return
 */
ndExceptionCaptureSettings.setStackTraceCaptureMode = function (stackTraceCaptureMode1) {
    try {
        if (stackTraceCaptureMode1) {
            var temp = parseInt(stackTraceCaptureMode1);
            if (temp == 0 || temp == 1) {
                stackTraceCaptureMode = temp;
                util.logger.info(agentConfReader.currentTestRun + " | NDExceptionCaptureSettings: Setting stackTraceCaptureMode  Value = " ,stackTraceCaptureMode)
                return true;
            }
            else {
                util.logger.info(agentConfReader.currentTestRun + " | NDExceptionCaptureSettings: Setting stackTraceCaptureMode  Value = " ,stackTraceCaptureMode)
                return false;
            }
        }
        else {
            util.logger.info(agentConfReader.currentTestRun + " | NDExceptionCaptureSettings: Not Setting stackTraceCaptureMode, as the value is null.")
            return false;
        }
    }
    catch (err) {
        util.logger.warn(agentConfReader.currentTestRun + " | NDExceptionCaptureSettings: Error in setting stackTraceCaptureMode, due to exception : ",err)
        return false;
    }
}

/**
 * sets the value of stack trace will be dumped as value or as ID
 * @param exceptionType1
 * @return
 */
ndExceptionCaptureSettings.setExceptionType = function (exceptionType1) {
    try {
        if (exceptionType1 != null) {
            var temp = parseInt(exceptionType1);
            if (temp == 0 || temp == 1) {
                exceptionType = temp;
                util.logger.info(agentConfReader.currentTestRun + " | NDExceptionCaptureSettings: Setting exceptionType  Value = " + exceptionType);
                return true;
            }
            else {
                util.logger.info(agentConfReader.currentTestRun + " | NDExceptionCaptureSettings: Not Setting exceptionType ,as value is invalid Value = " + exceptionType);
                return false;
            }
        }
        else {
            util.logger.info(agentConfReader.currentTestRun + " | NDExceptionCaptureSettings: Not Setting exceptionType as the value is null");
            return false;
        }
    }
    catch (err) {
        util.logger.warn(agentConfReader.currentTestRun + " | NDExceptionCaptureSettings: ",err)
        return false;
    }
}

/**
 * sets stack trace max depth
 *
 * @param stackTraceMaxDepth
 * @return
 */
ndExceptionCaptureSettings.setStackTraceMaxDepth = function (stackTraceMaxDepth1) {
    try {
        if (stackTraceMaxDepth1 != null) {
            var temp = parseInt(stackTraceMaxDepth1);
            if (temp > 0) {
                stackTraceMaxDepth = temp;     //todo this.stackTraceMaxDepth
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
    catch (err) {
        return false;
    }
}

ndExceptionCaptureSettings.getExceptionCaptureTraceLevel = function()
{
    return exceptionCaptureTraceLevel;
}

ndExceptionCaptureSettings.getExceptionCaptureMode = function()
{
    return exceptionCaptureMode;
}

ndExceptionCaptureSettings.getExceptionCauseCaptureMode = function()
{
    return exceptionCauseCaptureMode;
}

ndExceptionCaptureSettings.getStackTraceCaptureMode = function()
{
    return stackTraceCaptureMode;
}

ndExceptionCaptureSettings.getExceptionType = function()
{
    return exceptionType;
}

ndExceptionCaptureSettings.getStackTraceMaxDepth = function()
{
    return stackTraceMaxDepth;
}


module.exports = ndExceptionCaptureSettings;
