/**
 * Created by Sahil on 3/24/17.
 */

var NDHttpReqRespCaptureSettings = require('./NDHttpReqRespCaptureSettings'),
    NDHttpConditionStats = require('./NDHttpConditionStats'),
    NDSessionCaptureSettings = require('./NDSessionCaptureSettings'),
    agentSetting = require('./../agent-setting')
    util = require('./../util')
    samples = require('../nodetime/lib/samples.js'),
    headerMap = new Object(),
    httpHeaderNameOrValueId = 0,
    domain = require('domain'),
    duplicateHeaders={},
    getHdrSet = new Object(),
    MAX_RECORD_VALUE_LENGTH = 16384,
    MAX_FIELD_VALUE_LENGTH = 4096,
    allResponseHeaders =["Cache-Control", "Connection", "Date", "Pragma", "Transfer-Encoding", "Accept-Ranges", "Location", "Server", "Content-Length", "Content-Type", "Expires", "Last-Modified", "Content-Disposition", "WL-Result" ];

function NDHttpCaptureSettings(){}

NDHttpCaptureSettings.getMapLength = function(){
    return Object.keys(headerMap).length;
}
NDHttpCaptureSettings.handleMetadataRecovery = function(){
   return headerMap;
}

NDHttpCaptureSettings.setHttpReqRespCaptureSettings = function(keywordValue,httpType,isRequest){
    try {
        var locNDHttpReqRespCaptureSettings = new NDHttpReqRespCaptureSettings(),
            isValid;
        if (!keywordValue) {
            if(agentSetting.captureHttpTraceLevel > 0)
                util.logger.info(agentSetting.currentTestRun,"| NDHttpCaptureSettings: Retrurning without setting HttpCaptureSettings for " + httpType + ", as arguments are not provided.");
            return locNDHttpReqRespCaptureSettings;
        }
        var keywords = keywordValue.split('%20'),
            numberOfFields = keywords.length;

        isValid = locNDHttpReqRespCaptureSettings.setCaptureLevel(keywords[0], httpType, isRequest);
        if (!isValid) {
            if(agentSetting.captureHttpTraceLevel > 0)
                util.logger.info(agentSetting.currentTestRun,"| NDHttpCaptureSettings: Returning without setting httpCapturelevel for " + httpType + ", as value is invalid. Default value will be used. Value = 0 .");
            return locNDHttpReqRespCaptureSettings;
        }
        if (numberOfFields > 1) {
            isValid = locNDHttpReqRespCaptureSettings.setHdrMode(keywords[1], httpType);
            if (!isValid) {
                if(agentSetting.captureHttpTraceLevel > 0)
                    util.logger.info(agentSetting.currentTestRun,"| NDHttpCaptureSettings: Returning without setting httpHdrMode for " + httpType + ", as value is invalid. Default value will be used. Value = 0 .");
                return locNDHttpReqRespCaptureSettings;
            }
        }

        if (numberOfFields > 2) {
            isValid = locNDHttpReqRespCaptureSettings.setHdrValueLengthMode(keywords[2], httpType);
            if (!isValid) {
                if(agentSetting.captureHttpTraceLevel > 0)
                    util.logger.info(agentSetting.currentTestRun,"| NDHttpCaptureSettings: Returning without setting httpHdrValueLengthMode for " + httpType + ", as value is invalid. Default value will be used. Value = 0 .");
                return locNDHttpReqRespCaptureSettings;
            }
        }
        if (numberOfFields > 3) {
            isValid = locNDHttpReqRespCaptureSettings.setHdrValueMaxLength(keywords[3], httpType);
            if (!isValid) {
                if(agentSetting.captureHttpTraceLevel > 0)
                    util.logger.info(agentSetting.currentTestRun,"| NDHttpCaptureSettings: Returning without setting httpCaptureHdrValueMaxLength for " + httpType + ", as value is invalid. Default value will be used. Value = 0 .");
                return locNDHttpReqRespCaptureSettings;
            }
        }
        return locNDHttpReqRespCaptureSettings;
    }
    catch(err){
        util.logger.info(agentSetting.currentTestRun,"| NDHttpCaptureSettings", "setHttpReqRespCaptureSettings", "Error in setting hTTPcaptureReqKeyword for " ,err);
        return locNDHttpReqRespCaptureSettings;
    }
}

NDHttpCaptureSettings.dumpHttpReqResHeader= function(req,res,flowpathobj) {
    if(!flowpathobj)    return
    var flowpathObj,
        reqHeaders = req['headers'],
        sessionData = req['session'],
        respHeaders = res['_headers']
    flowpathObj = flowpathobj;
    var reqCapture,respCapture;
    if (agentSetting.httpReqCapturingSettings.captureLevel > 0) // 0-means capturing is disable
        reqCapture = agentSetting.httpReqCapturingSettings;
    if (agentSetting.httpResCapturingSettings.captureLevel > 0) // 0-means capturing is disable
        respCapture = agentSetting.httpResCapturingSettings;

    if (reqCapture && 3 == reqCapture.captureLevel)
            this.dumpHttpReqHeaders(req, reqCapture,flowpathObj,getAllHeadersAndValuesForRequest,getSpecifiedHeadersForRequest); // generate 6 record and dump them.
    if (respCapture && 2 == respCapture.captureLevel)
            this.dumpHttpRespHeaders(res, respCapture,flowpathObj,getAllHeadersAndValuesForResponse,getSpecifiedHeadersForResponse); // generate 6 record and dump them.

    NDHttpConditionStats.updateMonitorCount(req,res,reqCapture,respCapture)

    if(NDSessionCaptureSettings.sessionAttrCapturing){
        this.handleSessionAttr(sessionData,res,flowpathObj,this.dumpMappingOfHdrNameIdWithValue)
    }
    if(NDSessionCaptureSettings.customHeaderCapturing){
        this.handleCustomHttpHeaders(reqHeaders,respHeaders,flowpathObj,this.dumpMappingOfHdrNameIdWithValue)
    }
}

NDHttpCaptureSettings.dumpHttpRespHeaders= function(res ,respCapture,flowpathObj,getAllHeadersAndValuesForResponse,getSpecifiedHeadersForResponse) {
    var statusCode,respTime,category,respHeaderStr='';
    statusCode = flowpathObj.statusCode
    respTime = flowpathObj.respTime
    category =flowpathObj.category
    if(statusCode)
        respHeaderStr += statusCode + ',' // appending response code as 3rd field in 13 record.
    else {
        //if(ndHttpCptureTraceLevel > 1)
        //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpCapture: Not dumping responseCode as the value of status code is found null.");
    }
    if(0 == respCapture.hdrMode) // 0 means all headers to be captured.
        getAllHeadersAndValuesForResponse(res, respCapture,respHeaderStr,flowpathObj,respHeaderCallback);
    else
        getSpecifiedHeadersForResponse(res, respCapture,respHeaderStr,flowpathObj,respHeaderCallback); // capture only specified headers and their values for response, , null is for request object, false is to determine that it is not request.
}

/**
 * Gets specified header names and their values for request and response.
 * @param httpServletRequestObj
 * @param httpServletResponseObj
 */
function getSpecifiedHeadersForResponse  (res, respCapture,headerRecordStr,flowpathObj,respHeaderCallback) {
    try {
        if(agentSetting.captureHttpTraceLevel > 1)
            util.logger.info(agentSetting.currentTestRun,"| NDHttpCaptureSettings: getSpecifiedHeadersForResponse called. Going to dump specified headers for request :",respCapture.hdrNameList);

        var headers, headerName, headerValue
        headers = res['_headers'];
        if(agentSetting.captureHttpTraceLevel > 1)
            util.logger.info(agentSetting.currentTestRun,"| NDHttpCaptureSettings: Headers with values are :",headers);

        for (var i in respCapture.hdrNameList) {
            headerName = respCapture.hdrNameList[i]
            headerValue = headers[headerName]
            if (!headerValue) {
                if(agentSetting.captureHttpTraceLevel > 1)
                    util.logger.info(agentSetting.currentTestRun,"| NDHttpCaptureSettings: Continuing in the loop for response as the header value is found null for header name = " + headerName);
                continue
            }
            //if(NDHttpConditionStats.getHttpMonitorEnabled())
            //    headerValueForCondition = headerValue; // this is to store original value of header value, as we are going to put latest value without encoding
            headerRecordStr = respHeaderCallback(headerName, headerValue, respCapture, headerRecordStr, flowpathObj)

        }
        NDHttpCaptureSettings.dumpMappingOfHdrNameIdWithValue(false,headerRecordStr,flowpathObj);
    }
    catch(e){
        util.logger.info(agentSetting.currentTestRun,"| NDHttpCapture", "getSpecifiedHeadersForResponse", "Exception occured in getSpecifiedHeadersForResponse.....", e);
    }
}

/**
 * Gets all header names and their values.
 * @param httpServletRequestObj
 * @param httpServletResponseObj
 */
function getAllHeadersAndValuesForResponse  (res, respCapture,headerRecordStr,flowpathObj,respHeaderCallback) {
    try{
        if(agentSetting.captureHttpTraceLevel > 1)
            util.logger.info(agentSetting.currentTestRun,"| NDHttpCapture: Getting all headers for response");
        var headers,headerName,headerValue
        headers = res['_headers']

        if(!headers){
            for( var i in allResponseHeaders){
                headerName = allResponseHeaders[i]
                headerValue = res[allResponseHeaders[i]]
                if(!headerValue) {
                    if(agentSetting.captureHttpTraceLevel > 1)
                        util.logger.info(agentSetting.currentTestRun,"| NDHttpCaptureSettings: Continuing in the loop for response as the header value is found null for header name = " + headerName);
                    continue;
                }
                headerRecordStr = respHeaderCallback(headerName,headerValue,respCapture,headerRecordStr,flowpathObj)
            }
        }
        else{
            for(var i in headers){
                headerName =i
                headerValue = headers[i]
                if(!headerValue) {
                    if(agentSetting.captureHttpTraceLevel > 1)
                        util.logger.info(agentSetting.currentTestRun,"| NDHttpCaptureSettings: Continuing in the loop for response as the header value is found null for header name = " + headerName);

                    continue;
                }
                //if(NDHttpConditionStats.getHttpMonitorEnabled())
                //    headerValueForCondition = headerValue; // this is to store original value of header value, as we are going to put latest value without encoding
                headerRecordStr = respHeaderCallback(headerName,headerValue,respCapture,headerRecordStr,flowpathObj)
            }
        }
        NDHttpCaptureSettings.dumpMappingOfHdrNameIdWithValue(false,headerRecordStr,flowpathObj);
    }
    catch(e){
        util.logger.info(agentSetting.currentTestRun,"| NDHttpCaptureSettings", "getAllHeadersAndValuesForResponse", "Exception occured in getAllHeadersAndValuesForResponse.....", e);
    }
}

function getAllHeadersAndValuesForRequest (req,reqCapture,headerRecordStr,flowpath){
    if(agentSetting.captureHttpTraceLevel > 1)
        util.logger.info(agentSetting.currentTestRun,"| NDHttpCapture: Getting all headers for request");

    var headername,
        headerValue,
        headers,
        headerValueList,
        headerValueForCondition;
    duplicateHeaders={};
    headers = req['headers']
    if(agentSetting.captureHttpTraceLevel > 1)
        util.logger.info(agentSetting.currentTestRun,"| NDHttpCapture: For url :",req['originalUrl'] ,"Headers with values are :",headers);

    for(var i in headers){

        headername = i;
        headerValueList = headers[i]
        headerValue = headers[i]
        //for(var value in headerValueList){
        //    headerValue = headerValueList[value]
        //if(NDHttpConditionStats.getHttpMonitorEnabled())
        //    headerValueForCondition = headerValue; // this is to store original value of header value, as we are going to put latest value without encoding

        if(0 == reqCapture.hdrValueLengthMode)      //Complete or brief Mode
            headerValue = NDHttpCaptureSettings.encodeURL(headerValue, 0); // doing the url encoding for full value.
        else
            headerValue = NDHttpCaptureSettings.encodeURL(headerValue, reqCapture.hdrValueMaxLength); // truncation the value with specified length and then do the url encoding.

        // getting header name's id
        var headerNameId = NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord(headername);
        if(!getHdrSet[headername])
            headerRecordStr = NDHttpCaptureSettings.appendHeaderNameIdAndValue(headerNameId, headerValue, 12,headerRecordStr,flowpath);
        else {
            // getting header value's id
            var headerValueId = NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord(headerValue);
            headerRecordStr = NDHttpCaptureSettings.appendHeaderNameIdAndValueId(headerNameId, headerValueId, 12,headerRecordStr,flowpath);
        }
        //}
        //if(ndHttpCptureTraceLevel > 4)
        //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpCapture: " + headerName + " has been processed for header value: " + headerValue);
        //if(NDHttpConditionStats.getHttpMonitorEnabled())
        //    saveHdrValAtConditionIndex(NDHttpConditionStats.httpStatsCondReqHdrsMap, headerName, headerValueForCondition);

    }
    NDHttpCaptureSettings.dumpMappingOfHdrNameIdWithValue(true,headerRecordStr,flowpath);
}

function getSpecifiedHeadersForRequest (req, reqCapture,headerRecordStr,flowpathObj){
    if(agentSetting.captureHttpTraceLevel > 1)
        util.logger.info(agentSetting.currentTestRun,"| NDHttpCapture: getSpecifiedHeadersForRequest() called. Going to dump specified headers for request :",reqCapture.hdrNameList);

    var headername,
        headerValue,
        headers,
        headerValueList,
        headerValueForCondition;
    headers = req['headers']
    if(agentSetting.captureHttpTraceLevel > 1)
        util.logger.info(agentSetting.currentTestRun,"| NDHttpCapture: For url :",req['url'] ,"Headers with values are :",headers);

    try {
        for(var i in reqCapture.hdrNameList){

            headerValueList = headers[reqCapture.hdrNameList[i]]
            headerValue = headers[reqCapture.hdrNameList[i]]
            headername =reqCapture.hdrNameList[i]
            if(headerValueList == null) {
                if(agentSetting.captureHttpTraceLevel > 0)
                    util.logger.info(agentSetting.currentTestRun,"| NDHttpCapture: Continuing in the loop for request as the header value is found null for header name = " + headername);
                continue;
            }
            //if(NDHttpConditionStats.getHttpMonitorEnabled())
            //    headerValueForCondition = headerValue; // this is to store original value of header value, as we are going to put latest value without encoding
            var headerNameId = NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord(headername);
            if (0 == reqCapture.hdrValueLengthMode)
                headerValue = NDHttpCaptureSettings.encodeURL(headerValue, 0); // doing the url encoding for full value.
            else
                headerValue = NDHttpCaptureSettings.encodeURL(headerValue, reqCapture.hdrValueMaxLength); // truncation the value with specified length and then do the url encoding.

            //if(NDHttpConditionStats.getHttpMonitorEnabled())
            //    saveHdrValAtConditionIndex(NDHttpConditionStats.httpStatsCondReqHdrsMap, headerName, headerValueForCondition);
            if (!getHdrSet[headername])
                headerRecordStr = NDHttpCaptureSettings.appendHeaderNameIdAndValue(headerNameId, headerValue, 12, headerRecordStr, flowpathObj);
            else {
                // getting header value's id
                var headerValueId = NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord(headerValue);
                headerRecordStr = NDHttpCaptureSettings.appendHeaderNameIdAndValueId(headerNameId, headerValueId, 12, headerRecordStr, flowpathObj);
            }
        }

        NDHttpCaptureSettings.dumpMappingOfHdrNameIdWithValue(true,headerRecordStr,flowpathObj);
    }
    catch(e) {
        util.logger.info(agentSetting.currentTestRun,"| NDHttpCapture", "getSpecifiedHeadersForRequest ", e);
    }
}

/**
 * This Method is responsible for validation of headerName and headerValue before appending into 13 records.
 * @param headerName
 * @param headerValue
 * @param reqRespCapture
 */
function respHeaderCallback(headerName,headerValue,respCapture,headerRecordStr,flowpathObj){
    var headerNameId,headerValueId

    if(0 == respCapture.hdrValueLengthMode)
        headerValue = NDHttpCaptureSettings.encodeURL(headerValue, 0); // doing the url encoding for full value.
    else
        headerValue = NDHttpCaptureSettings.encodeURL(headerValue, respCapture.hdrValueMaxLength); // truncation the value with specified length and then do the url encoding.

    // getting header name's id
    headerNameId = NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord(headerName);

    if(!getHdrSet[headerName])
        headerRecordStr = NDHttpCaptureSettings.appendHeaderNameIdAndValue(headerNameId, headerValue, 13,headerRecordStr,flowpathObj);
    else {
        // getting header value's id
        headerValueId = NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord(headerValue);
        headerRecordStr = NDHttpCaptureSettings.appendHeaderNameIdAndValueId(headerNameId, headerValueId, 13,headerRecordStr,flowpathObj);
    }

    return headerRecordStr;
}

NDHttpCaptureSettings.dumpHttpReqHeaders= function(req ,reqCapture,flowpathObj,getAllHeadersAndValuesForRequest,getSpecifiedHeadersForRequest) {
    var httpMethod = req['method']
    var headerRecordStr=''
    if(httpMethod) {
        var headerNameId = NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord("HTTPMethod"), // It is the internal special header. Possible values for this are - Get and Post
            headerValueId = NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord(httpMethod); // possible values are Get/post
        headerRecordStr = NDHttpCaptureSettings.appendHeaderNameIdAndValueId(headerNameId, headerValueId, 12,headerRecordStr,flowpathObj);
    }
    else {
        if(agentSetting.captureHttpTraceLevel > 1)
            util.logger.warn(agentSetting.currentTestRun,"| NDHttpCapture: Not dumping HTTPMethod ,as its value found null.");
    }
    if(0 == reqCapture.hdrMode) // 0 means all headers to be captured.
        getAllHeadersAndValuesForRequest(req, reqCapture,headerRecordStr,flowpathObj);
    else
        getSpecifiedHeadersForRequest(req, reqCapture,headerRecordStr,flowpathObj); // capture only specified headers and their values, null is for response object, true is to determine request.
}

NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord = function(headerNameOrValue){
    var headerNameOrValueID = headerMap[headerNameOrValue]
    if(headerNameOrValueID) {
        if(agentSetting.captureHttpTraceLevel > 2)
            util.logger.info(agentSetting.currentTestRun,"| NDHttpCapture: Returning without dumping 6 Record for " + headerNameOrValue + ", as it is already dumped");
        return headerNameOrValueID;
    }
    try {
        //Discovery record for a header name or header value
        headerMap[headerNameOrValue] = ++httpHeaderNameOrValueId;
        var str=''
        str += "6,"
        str += headerNameOrValue
        str += ','
        str += httpHeaderNameOrValueId
        str += "\n"

        if(agentSetting.captureHttpTraceLevel > 2)
           util.logger.info(agentSetting.currentTestRun,"| NDHttpCapture: Dumping 6 Record : " + str);

        if (agentSetting.isToInstrument && agentSetting.dataConnHandler ) {
            samples.add(str);
        }
        return httpHeaderNameOrValueId;
    }
    catch(e ){
        util.logger.info(agentSetting.currentTestRun,"| NDHttpCapture", "getIDAndDumpHttpMetaRecord", "Exception occured in getIDAndDumpHttpMetarecord.....", e);
    }
    return headerNameOrValueID;
}

NDHttpCaptureSettings.checkAndTrimValueUptoMaxChar=function(value){
    if(value.length >= MAX_FIELD_VALUE_LENGTH-3)
        value = value.substring(0,MAX_FIELD_VALUE_LENGTH-3)

    return value
}

NDHttpCaptureSettings.appendHeaderNameIdAndValue2SpecificSessAttr = function(id, headerValue,fieldType,recordStr,flowpath){
    if((headerValue.length + 10 + recordStr.length) >= MAX_RECORD_VALUE_LENGTH && (recordStr.length > 0)) {
        this.dumpMappingOfHdrNameIdWithValue(17,recordStr,flowpath)
        //reset the sb to 0 size
        recordStr=''
    }
    return recordStr += id + ':' + fieldType + ':<' + this.checkAndTrimValueUptoMaxChar(headerValue) +'>|';
}
NDHttpCaptureSettings.appendHeaderNameIdAndValue = function(headerNameId,headerValue,type,recordStr,flowpath){
    try {
        if((headerValue.length + 10 + recordStr.length) >= MAX_RECORD_VALUE_LENGTH && (recordStr.length > 0)) {
            if(type == 12)
                this.dumpMappingOfHdrNameIdWithValue(true,recordStr,flowpath);
            else if(type == 13)
                this.dumpMappingOfHdrNameIdWithValue(false,recordStr,flowpath);
            else if(type == 18)
                this.dumpMappingOfHdrNameIdWithValue(18,recordStr,flowpath);

            //reset the sb to 0 size
            recordStr=''
        }
         return recordStr += headerNameId + ':<' + this.checkAndTrimValueUptoMaxChar(headerValue) +'>|';
    }
    catch(e) {
        util.logger.info(agentSetting.currentTestRun,"| NDHttpCapture", "appendHeaderNameIdAndValue", "Exception occured in appendHeaderNameIdAndValue.....", e);
    }
}

NDHttpCaptureSettings.dumpMappingOfHdrNameIdWithValue=function(isRequest,recodStr,flowpath){
    try {
        recodStr = recodStr.substring(0,recodStr.length-1);
        var headerRecord=''
        if(isRequest == true) // true for request only
            headerRecord += '12,' // for request we are generating 12 records.
        else if(isRequest == false)
            headerRecord += '13,' // for response we are generating 13 records.
        else if(isRequest == '17')
            headerRecord += '17,' // for response we are generating 18 records.
        else if(isRequest == '18')
            headerRecord += '18,' // for response we are generating 18 records.
        headerRecord += flowpath.flowPathId + ',';

        headerRecord += recodStr +'\n';

        if(agentSetting.captureHttpTraceLevel > 2)
            util.logger.info(agentSetting.currentTestRun,"| NDHttpCaptureSettings : Dumping header record : ",headerRecord)

        samples.add(headerRecord);
    }
    catch(e){
        util.logger.error(agentSetting.currentTestRun,"| NDHttpCaptureSettings", "dumpMappingOfHdrNameIdWithValue", "Exception occured in dumpMappingOfHdrNameIdWithValue.....", e);
    }
}

NDHttpCaptureSettings.appendHeaderNameIdAndValueId = function(headerNameId, headerValueId,recordType,headerRecordStr,flowpath){
    if(headerRecordStr && headerRecordStr.length +20 >= MAX_RECORD_VALUE_LENGTH &&headerRecordStr.length >0){
        if(agentSetting.captureHttpTraceLevel > 2)
            util.logger.info(agentSetting.currentTestRun,"| NDHttpCaptureSettings : header recordString exceeds length, so going to dump header record");

        if(recordType == 12)
            this.dumpMappingOfHdrNameIdWithValue(true,headerRecordStr,flowpath);
        else if(recordType == 13)
            this.dumpMappingOfHdrNameIdWithValue(false,headerRecordStr,flowpath);

        headerRecordStr=''
    }
    return headerRecordStr += headerNameId +':'+ headerValueId +'|'
}

NDHttpCaptureSettings.handleSessionAttr=function(sessionObj,res,flowpath,callback1){
    var headerRecordStr='',
        typeOfRecord=18;
    if(!sessionObj)
        return

    for(var attr in sessionObj){
        var attrName = attr,
            attrValue = sessionObj[attr];

        if(NDSessionCaptureSettings.isSpecficSessionCapturing){
            var listOfHeaders = NDSessionCaptureSettings.getHeaderData(attr)
            if(!listOfHeaders || listOfHeaders.length == 0)
                continue;

            var mode =listOfHeaders[0].dumpMode
            if(mode >= 2) {          //2 capture all, 3 = capture all and also capture provided attributes based on left bound and right bound
                var hdrVaue = NDHttpCaptureSettings.encodeURL(attrValue, 0); // doing the url encoding for full value.
                var headerNameId = this.getIDAndDumpHttpMetaRecord(attrName);
                headerRecordStr = NDHttpCaptureSettings.appendHeaderNameIdAndValue(headerNameId, hdrVaue, 18,headerRecordStr,flowpath);
            }
            if(mode == 2 ) {      //CAPTURE_ALL
                continue;//do not dump 17 record in case of all that is either 3 or 2
            }
            if(typeof attrValue == 'object')
                attrValue = (JSON.stringify(attrValue))

            for(var i in listOfHeaders){
                var headerObj = listOfHeaders[i]
                if(mode >= 1){
                    var fieldName = headerObj.name,
                        fieldType = headerObj.type,
                        leftBound = headerObj.leftBound,
                        rightBound = headerObj.rightBound,
                        endIndex = 0,
                        beginIndex = -1,
                        valueStartIndex = 0;

                    if(!fieldName) {
                        //if(NDSettings.ndSessionSettings.sessionCapturingTraceLevel > 1)
                        //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "Specific value is getting null for fieldName ");
                        continue;
                    }
                    for(var j=0;j< attrValue.length;j=endIndex )
                    {
                        if(leftBound){
                            valueStartIndex = leftBound.length;
                            beginIndex =  attrValue.indexOf(leftBound, endIndex);
                            valueStartIndex += beginIndex;
                        }
                        else
                            valueStartIndex = beginIndex + 1;
                        if(rightBound)
                            endIndex =  attrValue.indexOf(rightBound, valueStartIndex);
                        else
                            endIndex = attrValue.length;

                        if(-1 == beginIndex && null != leftBound)
                            break;
                        typeOfRecord =17
                        var fieldValueStr= attrValue.substring(valueStartIndex, endIndex);
                        fieldValueStr = NDHttpCaptureSettings.encodeURL(fieldValueStr, 0); // doing the url encoding for full value.
                        var id = NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord(fieldName)
                        headerRecordStr = NDHttpCaptureSettings.appendHeaderNameIdAndValue2SpecificSessAttr(id, fieldValueStr,fieldType,headerRecordStr,flowpath);
                    }
                }
            }
        }
        else{
            typeOfRecord =18
            var hdrVaue = NDHttpCaptureSettings.encodeURL(attrValue, 0); // doing the url encoding for full value.
            var headerNameId = NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord(attrName);
            headerRecordStr = NDHttpCaptureSettings.appendHeaderNameIdAndValue(headerNameId, hdrVaue, 18,headerRecordStr,flowpath);
        }
    }
    if(headerRecordStr.length)
        callback1(typeOfRecord,headerRecordStr,flowpath)
}

NDHttpCaptureSettings.handleCustomHttpHeaders=function(reqHeaders,res,flowpath,callback1,callback2){
    var headerRecordStr='',
        typeOfRecord=17;
    if(!reqHeaders)
        return

    for(var attr in reqHeaders){
        var attrName = attr,
            attrValue = reqHeaders[attr];

        if(NDSessionCaptureSettings.isSpecficCustomHeaderCapturing){
            var listOfHeaders = NDSessionCaptureSettings.getHeaderData(attr)
            if(!listOfHeaders || listOfHeaders.length == 0)
                continue;

            var mode =listOfHeaders[0].dumpMode
            if(mode >= 2) {          //2 capture all, 3 = capture all and also capture provided attributes based on left bound and right bound
                var hdrVaue = NDHttpCaptureSettings.encodeURL(attrValue, 0); // doing the url encoding for full value.
                var headerNameId = this.getIDAndDumpHttpMetaRecord(attrName);
                headerRecordStr = NDHttpCaptureSettings.appendHeaderNameIdAndValue2SpecificSessAttr(headerNameId, hdrVaue,0,headerRecordStr,flowpath);
            }
            if(mode == 2 ) {      //CAPTURE_ALL
                continue;//do not dump 17 record in case of all that is either 3 or 2
            }

            for(var i in listOfHeaders){
                var headerObj = listOfHeaders[i]
                if(mode >= 1){
                    var fieldName = headerObj.name,
                        fieldType = headerObj.type,
                        leftBound = headerObj.leftBound,
                        rightBound = headerObj.rightBound,
                        endIndex = 0,
                        beginIndex = -1,
                        valueStartIndex = 0;

                    if(!fieldName) {
                        //if(NDSettings.ndSessionSettings.sessionCapturingTraceLevel > 1)
                        //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "Specific value is getting null for fieldName ");
                        continue;
                    }
                    for(var j=0;j< attrValue.length;j=endIndex )
                    {
                        if(leftBound){
                            valueStartIndex = leftBound.length;
                            beginIndex =  attrValue.indexOf(leftBound, endIndex);
                            valueStartIndex += beginIndex;
                        }
                        else
                            valueStartIndex = beginIndex + 1;

                        if(rightBound)
                            endIndex =  attrValue.indexOf(rightBound, valueStartIndex);
                        else
                            endIndex = attrValue.length;

                        if(-1 == beginIndex && null != leftBound)
                            break;
                        typeOfRecord =17
                        var fieldValueStr= attrValue.substring(valueStartIndex, endIndex);
                        fieldValueStr = NDHttpCaptureSettings.encodeURL(fieldValueStr, 0); // doing the url encoding for full value.
                        var id = NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord(fieldName)
                        headerRecordStr = NDHttpCaptureSettings.appendHeaderNameIdAndValue2SpecificSessAttr(id, fieldValueStr,fieldType,headerRecordStr,flowpath);
                    }
                }
            }
        }
        else{
            typeOfRecord =17
            var hdrVaue = NDHttpCaptureSettings.encodeURL(attrValue, 0); // doing the url encoding for full value.
            var headerNameId = NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord(attrName);
            headerRecordStr = NDHttpCaptureSettings.appendHeaderNameIdAndValue2SpecificSessAttr(headerNameId, hdrVaue,0,headerRecordStr,flowpath);
        }
    }
    if(headerRecordStr.length)
        callback1(typeOfRecord,headerRecordStr,flowpath)

}

NDHttpCaptureSettings.encodeURL = function(header,maxlength) {
    if((maxlength != 0) && (header.length > maxlength))
        header = header.substring(0, maxlength); // truncating the string upto maxLength

    return encodeURIComponent(JSON.stringify(header)); // returning the url encoded String.
}

module.exports=NDHttpCaptureSettings;