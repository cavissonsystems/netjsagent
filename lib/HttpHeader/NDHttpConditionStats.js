/**
 * Created by Sahil on 3/28/17.
 */
var OPERATOR_TYPE_GT = " GT ",
    OPERATOR_TYPE_LT = " LT ",
    OPERATOR_TYPE_GTE = " GTE ",
    OPERATOR_TYPE_LTE = " LTE ",
    OPERATOR_TYPE_EQ = " EQ ",
    OPERATOR_TYPE_CONTAINS = " CONTAINS ",
    OPERATOR_TYPE_NOT_EQ = " NOTEQ ",
    OPERATOR_TYPE_NOT_CONTAINS = " NOTCONTAINS ",
    OPERATOR_TYPE_PRESENT = " PRESENT",
    OPERATOR_TYPE_NOT_PRESENT = " NOTPRESENT",
    COND_HEADER_TYPE_REQ = "ReqHdr.",
    COND_HEADER_TYPE_REP = "RepHdr.",
    COND_COOKIE_TYPE_REQ = "ReqCookie.",
    COND_OPERATOR_TYPE_GT = 1,
    COND_OPERATOR_TYPE_LT = 2,
    COND_OPERATOR_TYPE_GTE = 3,
    COND_OPERATOR_TYPE_LTE = 4,
    COND_OPERATOR_TYPE_EQ = 5,
    COND_OPERATOR_TYPE_CONTAINS = 6,
    COND_OPERATOR_TYPE_NOT_EQ = 7,
    COND_OPERATOR_TYPE_NOT_CONTAINS = 8,
    COND_OPERATOR_TYPE_PRESENT = 9,
    COND_OPERATOR_TYPE_NOT_PRESENT = 10,
    monitoringList = new Object(),                      //Containg <Headername :AliasName>
    httpStatsCondReqHdrsMap = new Object(),             //Containg <Headername :HeaderID>
    httpStatsCondRespHdrsMap = new Object(),            //Containg <Headername :HeaderID>
    NDHttpConditionMonitorData = require('./HDHttpConditionMonitorData'),
    AgentSetting = require('./../agent-setting'),
    samples = require('../nodetime/lib/samples.js'),
    util = require('./../util'),
    httpConditionMonitoringMap = new Object(),          //<HeaderID(httpStatsCondReqHdrsMap) : NDHttpConditionMonitorData>
    httpMonTimer = undefined,
    headerConditionId = 0,         //Id for complete header condition <DNT = 2>
    headerID = 0;                  //Id for single headername <DNT>


function NDHttpConditionStats(){}

NDHttpConditionStats.isHttpConditionEnabled =false;
NDHttpConditionStats.isCookieMonEnabled =false;

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};
function setHeaderNameAndId(hdrField,headerName) {
    var curVal = hdrField,
        type = 0,                                       // 1- for header req 2- cooki in req 3- rep for header
        index = 0,curHdr,id,
        data = new Object()
    data.headerConditionName = headerName
    if (curVal.startsWith(COND_HEADER_TYPE_REQ)) {
        type = 1;
        index = COND_HEADER_TYPE_REQ.length;
    }
    else if (curVal.startsWith(COND_COOKIE_TYPE_REQ)) {
        type = 2;
        index = COND_COOKIE_TYPE_REQ.length;
    }
    else if (curVal.startsWith(COND_HEADER_TYPE_REP)) {
        type = 3;
        index = COND_HEADER_TYPE_REP.length;
    }
    if ((type == 1) || (type == 2)) {
        data.curHdr = curVal.substring(index, curVal.length);        //Create current targeted requestHeaders
        id = httpStatsCondReqHdrsMap[curHdr]
        if(!id){
            data.id = ++headerID;
            httpStatsCondReqHdrsMap[data.curHdr] = data
        }
    }
    else if (type == 3) {
        data.curHdr = curVal.substring(index, curVal.length);          //Create current targeted responseHeaders
        id = httpStatsCondRespHdrsMap[curHdr]
        if(!id){
            data.id = ++headerID;
            httpStatsCondRespHdrsMap[data.curHdr] = data
        }
    }
    else {
        //if (ndHttpCptureTraceLevel > 1)
        //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "Invalid header found, so ignoring.");
        return;
    }
    return {headerName:data.curHdr,headerId:data.id}
}
function Callback(headerName,alisaName){
    try {
        var headerField = headerName.toString().trim().split(' ');
        //var headerData = monitoringList[headerName],
        var allFields = new Object();
        //if(!headerData)
        allFields.headerConditionId = ++headerConditionId;
        allFields.headerNameWithCondition =headerName;
        allFields.alisaName = alisaName;

        if(headerField.length >2){
            allFields.headerNameField = headerField[0].toString().trim();
            allFields.headerNameAndId = setHeaderNameAndId(allFields.headerNameField,headerName)
            allFields.operatorField = headerField[1].toString().trim();
            allFields.valueField = headerField[2].toString().trim();
        }
        else if(headerField.length ==2){
            allFields.headerNameField = headerField[0].toString().trim();
            allFields.headerNameAndId = setHeaderNameAndId(allFields.headerNameField,headerName)
            allFields.operatorField = headerField[1].toString().trim();

            switch(allFields.operatorField){
                case 'PRESENT':
                    allFields.operatorId = COND_OPERATOR_TYPE_PRESENT;
                    break;
                case 'NOTPRESENT':
                    allFields.operatorId = COND_OPERATOR_TYPE_NOT_PRESENT;
                    break;
                default :
                    break;
            }
        }
        monitoringList[headerName] = allFields;
    } catch(err) {
        util.logger.info(AgentSetting.currentTestRun,"| NDHttpConditionStats", "createTargetedReqAndRespHeadersList", "Error occured while creating condition headers for request and response types", err);
    }
}

NDHttpConditionStats.manageAllSpecifiedConditions=function(headerList){
    try{
        monitoringList={}
        if(!headerList){
            if(AgentSetting.captureHttpTraceLevel > 0)
                util.logger.info(AgentSetting.currentTestRun,"| No condiitons found for monitoring.");
            NDHttpConditionStats.isHttpConditionEnabled = false;
            return;
        }
        this.resetValues();
        var isCookieMonEnabled = false;
        for( var i in headerList) {
            if (headerList[i].length == 0 || (headerList[i].toString().trim().startsWith("#")) || (headerList[i].toString().trim().startsWith(" ")))
                continue;
            var allFields = headerList[i].toString().trim().split("|");
            var conditionStr=''
            if(allFields[1] && allFields[1].toString().trim().indexOf(COND_COOKIE_TYPE_REQ) != -1)
                isCookieMonEnabled = true;
            if (allFields.length > 1)
                conditionStr = Callback(allFields[1].toString().trim(),allFields[0].toString().trim())
            else{
                if(AgentSetting.captureHttpTraceLevel > 1)
                    util.logger.info(AgentSetting.currentTestRun,"| ERROR:- Invalid Condition Expression found In current Line = " + headerList[i]);
                continue;
            }
        }
        if(AgentSetting.captureHttpTraceLevel > 0)
            util.logger.info(AgentSetting.currentTestRun,"| NDHttpConditionStats", "createTargetedReqAndRespHeadersList ,All headers to be monitor : ",monitoringList,"Request header map : ",httpStatsCondReqHdrsMap ,"Response header map : ",httpStatsCondRespHdrsMap)

        NDHttpConditionStats.isHttpConditionEnabled =true;
        NDHttpConditionStats.isCookieMonEnabled = isCookieMonEnabled
    }catch(err){
        NDHttpConditionStats.isHttpConditionEnabled = false;
        util.logger.info(AgentSetting.currentTestRun,"| NDHttpConditionStats", "manageAllSpecifiedConditions", " Exception while managing MonitoringLists.", err);
    }
}
NDHttpConditionStats.updateMonitorCount = function(req,res,reqCapture,respCapture){
    try {
        /*if(NDHttpConditionStats.isCookieMonEnabled){
            if (Object.keys(httpStatsCondReqHdrsMap).length > 0)
                this.saveResponseHttpHdrValueForConditons(req, httpStatsCondReqHdrsMap,req['headers']);
        }*/
        if (NDHttpConditionStats.isHttpConditionEnabled) {
            if (Object.keys(httpStatsCondReqHdrsMap).length > 0)
                this.saveResponseHttpHdrValueForConditons(req, httpStatsCondReqHdrsMap,req['headers']);
            if (Object.keys(httpStatsCondRespHdrsMap).length > 0)
                this.saveResponseHttpHdrValueForConditons(res, httpStatsCondRespHdrsMap,res['_headers']);
        }
    }catch(err){
        util.logger.info(AgentSetting.currentTestRun,"| NDHttpConditionStats", "manageAllSpecifiedConditions", " Exception while managing MonitoringLists.", err);
    }
}
NDHttpConditionStats.saveResponseHttpHdrValueForConditons = function(requestType,reqTypeMap,comingHeaderList) {
    try {
        for (var i in reqTypeMap) {               //To run for loop only number of times we use map where key is only header name
            var headerName = i,
                headerData = reqTypeMap[i],
                monitorData = monitoringList[headerData.headerConditionName],
                headerId,
                headerValue
            headerValue = comingHeaderList[headerName.toLowerCase()]
            if (!headerValue){
                if('!PRESENT' == monitorData.operatorField.toUpperCase()){
                    updateCount(monitorData, headerData)
                }
                else
                    continue;
            }
            checkHeaderValueMatchesOrNot(monitorData, headerData, headerValue, updateCount)
            //updateCount(headerName,headerId,headerValue,aliasName)
        }
    }
    catch(err){
        util.logger.info(AgentSetting.currentTestRun,"| NDHttpConditionStats", "manageAllSpecifiedConditions", " Exception while managing MonitoringLists.", err);
    }
}

function checkHeaderValueMatchesOrNot(monitorData,headerData,headerValue,updateCount){
    try {
        if(!monitorData)
            return
        var operator = monitorData.operatorField.toUpperCase(),
            valueField = monitorData.valueField
        switch (operator) {
            case ('>='):
                if (headerValue >= valueField)
                    updateCount(monitorData, headerData)
                break;
            case ('<='):
                if (headerValue <= valueField)
                    updateCount(monitorData, headerData)
                break;
            case ('!='):
                if (headerValue != valueField)
                    updateCount(monitorData, headerData)
                break;
            case ('!EQ'):
                if (headerValue !== valueField)
                    updateCount(monitorData, headerData)
                break;
            case ('EQ'):
                if (headerValue == valueField)
                    updateCount(monitorData, headerData)
                break;
            case ('=='):
                if (headerValue == valueField)
                    updateCount(monitorData, headerData)
                break;
            case ('>'):
                if (headerValue > valueField)
                    updateCount(monitorData, headerData)
                break;
            case ('<'):
                if (headerValue < valueField)
                    updateCount(monitorData, headerData)
                break;
            case ('CONTAINS'):
                if (headerValue.indexOf(valueField) != -1)
                    updateCount(monitorData, headerData)
                break;
            case ('!CONTAINS'):
                if (headerValue.indexOf(valueField) == -1)
                    updateCount(monitorData, headerData)
                break;
            case ('PRESENT'):
                    updateCount(monitorData, headerData)
                break;
            case ('!PRESENT'):
                if (headerValue != valueField)
                    updateCount(monitorData, headerData)
                break;
            case ('='):
                if (headerValue = valueField)
                    updateCount(monitorData, headerData)
                break;
            default :
                return;
        }
    }catch(err){
        util.logger.info(AgentSetting.currentTestRun,"| NDHttpConditionStats", "manageAllSpecifiedConditions", " Exception while managing MonitoringLists.", err);
    }
}
function updateCount (monitorData,headerData){//headerName,headerId,headerValue,aliasName){
    try {
        var headerId = monitorData.headerConditionId,
            aliasName = monitorData.alisaName,
            headerName = headerData.curHdr;

        var headerData = httpConditionMonitoringMap[headerId];
        if (!headerData) {
            headerData = new NDHttpConditionMonitorData(headerId, headerName, aliasName)
            httpConditionMonitoringMap[headerId] = headerData;
        }
        headerData.updateCount()
    }catch(err){
        util.logger.info(AgentSetting.currentTestRun,"| NDHttpConditionStats", "manageAllSpecifiedConditions", " Exception while managing MonitoringLists.", err);
    }
}
NDHttpConditionStats.startHttpConditioMonitor = function(){
    try {
        if (AgentSetting.isTestRunning) {
            if(httpMonTimer === undefined)
                httpMonTimer = setInterval(this.dumpHttpConditioMonitor, AgentSetting.ndMonitorInterval);
        }
    }
    catch(err){util.logger.warn(util.logger.info(AgentSetting.currentTestRun,"| NDHttpConditionStats startHttpConditioMonitor",err))}
}
NDHttpConditionStats.stopHttpConditioMonitor = function(){
    try{
        clearInterval(httpMonTimer);
	httpMonTimer === undefined
    }
    catch(err){util.logger.warn(util.logger.info(AgentSetting.currentTestRun,"| NDHttpConditionStats stopHttpConditioMonitor",err))}
}

NDHttpConditionStats.dumpHttpConditioMonitor = function(){
    try {
        var keys = Object.keys(httpConditionMonitoringMap);
        if (keys.length) {
            for (i in keys) {
                var headerId = keys[i];
                var headerdata = httpConditionMonitoringMap[keys[i]];
                var cumCount= 0,
                    invocationCount = 0,
                    rate;

                cumCount = headerdata.cumCount;
                invocationCount = headerdata.cumCount - headerdata.prevCumCount
                headerdata.init()
                rate = invocationCount / parseInt(AgentSetting.ndMonitorInterval / 1000)
                if (AgentSetting.isToInstrument && AgentSetting.autoSensorConnHandler) {
                    var data61 = NDHttpConditionStats.appendData(cumCount,invocationCount,rate,headerdata.conditionId,headerdata.aliasName);
                    samples.toBuffer(data61);
                    if(AgentSetting.captureHttpTraceLevel > 2)
                        util.logger.info(AgentSetting.currentTestRun,"| Dumping  http condition monitor ",data61)

                }
            }
        }
    }
    catch(err){util.logger.warn(util.logger.info(AgentSetting.currentTestRun,"| NDHttpConditionStats dumpHttpConditioMonitor",err))}
}
NDHttpConditionStats.appendData=function(cumCount,invocationCount,rate,id,aliasName){
    var str=''
    str += '62,'
    str += AgentSetting.vectorPrefixID
    str += id + ':'
    str += AgentSetting.vectorPrefix
    str += aliasName + '|'
    str += cumCount + ' '
    str += rate + ' '
    str += '\n'

    return str;
}

NDHttpConditionStats.resetValues=function(){
    headerID =0
    headerConditionId = 0
    monitoringList = new Object()                     //Containg <Headername :AliasName>
    httpStatsCondReqHdrsMap = new Object()             //Containg <Headername :HeaderID>
    httpStatsCondRespHdrsMap = new Object()            //Containg <Headername :HeaderID>
    httpConditionMonitoringMap = new Object()
    if(AgentSetting.captureHttpTraceLevel > 0)
        util.logger.info(AgentSetting.currentTestRun,"| Reseting all http condition monitor value : headerID =",headerID,"headerConditionId = ",headerConditionId)
}

module.exports = NDHttpConditionStats;
