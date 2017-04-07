/**
 * Created by Sahil on 3/24/17.
 */

var NDHttpReqRespCaptureSettings = require('./NDHttpReqRespCaptureSettings'),
    NDHttpConditionStats = require('./NDHttpConditionStats'),
    agentSetting = require('./../agent-setting')
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
            //if(httpCaptureTraceLevel > 1)
            //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpCaptureSettings: Retrurning without setting HttpCaptureSettings for " + httpLeveltype + ", as arguments are not provided.");
            return locNDHttpReqRespCaptureSettings;
        }
        var keywords = keywordValue.split('%20'),
            numberOfFields = keywords.length;

        isValid = locNDHttpReqRespCaptureSettings.setCaptureLevel(keywords[0], httpType, isRequest);
        if (!isValid) {
            //NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpCaptureSettings: Returning without setting httpCapturelevel for " + httpLeveltype + ", as value is invalid. Default value will be used. Value = " + locNDHttpReqRespCaptureSettings.getCaptureLevel() + ".");
            return locNDHttpReqRespCaptureSettings;
        }
        if (numberOfFields > 1) {
            isValid = locNDHttpReqRespCaptureSettings.setHdrMode(keywords[1], httpType);
            if (!isValid) {
                //NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpCaptureSettings: Returning without setting httpHdrMode for " + httpLeveltype + ", as value is invalid. Default value will be used. Value = " + locNDHttpReqRespCaptureSettings.getHdrMode() + ".");
                return locNDHttpReqRespCaptureSettings;
            }
        }

        if (numberOfFields > 2) {
            isValid = locNDHttpReqRespCaptureSettings.setHdrValueLengthMode(keywords[2], httpType);
            if (!isValid) {
                //NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpCaptureSettings: Returning without setting httpHdrValueLengthMode for " + httpLeveltype + ", as value is invalid. Default value will be used. Value = " + locNDHttpReqRespCaptureSettings.getHdrValueLengthMode() + ".");
                return locNDHttpReqRespCaptureSettings;
            }
        }

        if (numberOfFields > 3) {
            isValid = locNDHttpReqRespCaptureSettings.setHdrValueMaxLength(keywords[3], httpType);
            if (!isValid) {
                //NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpCaptureSettings: Returning without setting httpCaptureHdrValueMaxLength for " + httpLeveltype + ", as value is invalid. Default value will be used. Value = " + locNDHttpReqRespCaptureSettings.getHdrValueMaxLength() + ".");
                return locNDHttpReqRespCaptureSettings;
            }
        }

        return locNDHttpReqRespCaptureSettings;
    }
    catch(err){
        console.log(err)
        //NDListener.logBCIError(Server.TestRunIDValue, "NDHttpCaptureSettings", "setHttpReqRespCaptureSettings", "Error in setting hTTPcaptureReqKeyword for " + httpLeveltype + ", due to exception = " + ex + ". Received value=" + strKeywordValue + ".");
        return locNDHttpReqRespCaptureSettings;
    }

}

NDHttpCaptureSettings.dumpHttpReqResHeader= function(req,res,flowpathobj) {
    var flowpathObj ;
    flowpathObj = flowpathobj;
    if(!flowpathobj)    return
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
        var headers, headerName, headerValue
        headers = res['_headers'];
        for (var i in respCapture.hdrNameList) {
            headerName = respCapture.hdrNameList[i]
            headerValue = headers[headerName]
            if (!headerValue) {
                //if(ndHttpCptureTraceLevel > 3)
                //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpCapture: Continuing in the loop for response as the header value is found null for header name = " + headerName);
                continue
            }
            //if(NDHttpConditionStats.getHttpMonitorEnabled())
            //    headerValueForCondition = headerValue; // this is to store original value of header value, as we are going to put latest value without encoding
            headerRecordStr = respHeaderCallback(headerName, headerValue, respCapture, headerRecordStr, flowpathObj)

        }
        NDHttpCaptureSettings.dumpMappingOfHdrNameIdWithValue(false,headerRecordStr,flowpathObj);
    }
    catch(e){
        //NDListener.logBCIError(Server.TestRunIDValue, "NDHttpCapture", "getSpecifiedHeadersForResponse", "Exception occured in getSpecifiedHeadersForResponse.....", e);
    }
}

/**
 * Gets all header names and their values.
 * @param httpServletRequestObj
 * @param httpServletResponseObj
 */
function getAllHeadersAndValuesForResponse  (res, respCapture,headerRecordStr,flowpathObj,respHeaderCallback) {
    try{
        var headers,headerName,headerValue
        headers = res['_headers']

        if(!headers){
            for( var i in allResponseHeaders){
                headerName = res[allResponseHeaders[i]]
            }
        }
        else{
            for(var i in headers){
                headerName =i
                headerValue = headers[i]
                if(!headerValue) {
                    //if(ndHttpCptureTraceLevel > 3)
                    //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpCapture: Continuing in the loop for response as the header value is found null for header name = " + headerName);
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
        //NDListener.logBCIError(Server.TestRunIDValue, "NDHttpCapture", "getSpecifiedHeadersForResponse", "Exception occured in getSpecifiedHeadersForResponse.....", e);
    }
}

function getAllHeadersAndValuesForRequest (req,reqCapture,headerRecordStr,flowpath){
    var headername,
        headerValue,
        headers,
        headerValueList,
        headerValueForCondition;
    duplicateHeaders={};
    headers = req['headers']
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
    //if(ndHttpCptureTraceLevel > 4)
    //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpCapture: getSpecifiedHeadersForRequest() called. Going to dump specified headers for request");

    var headername,
        headerValue,
        headers,
        headerValueList,
        headerValueForCondition;
    headers = req['headers']
    try {
        for(var i in reqCapture.hdrNameList){

            headerValueList = headers[reqCapture.hdrNameList[i]]
            headerValue = headers[reqCapture.hdrNameList[i]]
            headername =i
            if(headerValueList == null) {
                //if(ndHttpCptureTraceLevel > 3)
                //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpCapture: Continuing in the loop for request as the header value is found null for header name = " + headerName);
                continue;
            }
            //if(NDHttpConditionStats.getHttpMonitorEnabled())
            //    headerValueForCondition = headerValue; // this is to store original value of header value, as we are going to put latest value without encoding
            //for(var value in headerValueList) {
            //    headerValue = headerValueList[value]
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
            //}

        }

        NDHttpCaptureSettings.dumpMappingOfHdrNameIdWithValue(true,headerRecordStr,flowpathObj);
    }
    catch(e) {
        console.log(e)
        //if((ndHttpCptureTraceLevel > 5) || !isNoSuchMethodExceptionGetHeadersDumped) {
        //    NDListener.logBCIError(Server.TestRunIDValue, "NDHttpCapture", "getSpecifiedHeadersForRequest", "NoSuchMethodException occured in getSpecifiedHeadersForRequest.....", noSuchMethodException);
        //    isNoSuchMethodExceptionGetHeadersDumped = true;
        //}
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
        //if(ndHttpCptureTraceLevel > 4)
        //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpCapture: Not dumping HTTPMethod ,as its value found null.");
    }
    if(0 == reqCapture.hdrMode) // 0 means all headers to be captured.
        getAllHeadersAndValuesForRequest(req, reqCapture,headerRecordStr,flowpathObj);
    else
        getSpecifiedHeadersForRequest(req, reqCapture,headerRecordStr,flowpathObj); // capture only specified headers and their values, null is for response object, true is to determine request.
}

NDHttpCaptureSettings.getIDAndDumpHttpMetaRecord = function(headerNameOrValue){
    var headerNameOrValueID = headerMap[headerNameOrValue]
    if(headerNameOrValueID) {
        //if(ndHttpCptureTraceLevel > 2)
        //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpCapture: Returning without dumping 6 Record for " + headerNameOrValue + ", as it is already dumped");
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

        //if(ndHttpCptureTraceLevel > 4)
        //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpCapture: Dumping 6 Record : " + sb.toString());

        if (agentSetting.isToInstrument && agentSetting.dataConnHandler ) {
            samples.add(str);
        }
        return httpHeaderNameOrValueId;
    }
    catch(e ){
        console.log(e)
        //NDListener.logBCIError(Server.TestRunIDValue, "NDHttpCapture", "getIDAndDumpHttpMetaRecord", "Exception occured in getIDAndDumpHttpMetarecord.....", e);
    }
    return headerNameOrValueID;
}

NDHttpCaptureSettings.checkAndTrimValueUptoMaxChar=function(value){
    if(value.length >= MAX_FIELD_VALUE_LENGTH-3)
        value = value.substring(0,MAX_FIELD_VALUE_LENGTH-3)

    return value
}

NDHttpCaptureSettings.appendHeaderNameIdAndValue = function(headerNameId,headerValue,type,recordStr,flowpath){
    try {
        if((headerValue.length + 10 + recordStr.length) >= MAX_RECORD_VALUE_LENGTH && (recordStr.length > 0)) {
            if(type == 12)
                this.dumpMappingOfHdrNameIdWithValue(true,recordStr,flowpath);
            else if(type == 13)
                this.dumpMappingOfHdrNameIdWithValue(false,recordStr,flowpath);

            //reset the sb to 0 size
            recordStr=''
        }
         return recordStr += headerNameId + ':<' + this.checkAndTrimValueUptoMaxChar(headerValue) +'>|';
        /*headerNameValueId.get().append(headerNameId);
        // Since hdr value is to be dumped, it will be in <> brackets to identify it.
        headerNameValueId.get().append(":<");
        headerNameValueId.get().append(checkAndTrimValueUptoMaxChar(headerValue)); //Checking for header-value length max limit
        headerNameValueId.get().append('>');
        headerNameValueId.get().append('|');*/
    }
    catch(e) {
        console.log(e)
        //NDListener.logBCIError(Server.TestRunIDValue, "NDHttpCapture", "appendHeaderNameIdAndValue", "Exception occured in appendHeaderNameIdAndValue.....", e);
    }
}

NDHttpCaptureSettings.dumpMappingOfHdrNameIdWithValue=function(isRequest,recodStr,flowpath){
    try {
        recodStr = recodStr.substring(0,recodStr.length-1);
        var headerRecord=''
        if(isRequest) // true for request only
            headerRecord += '12,' // for request we are generating 12 records.
        else
            headerRecord += '13,' // for response we are generating 13 records.
        headerRecord += flowpath.flowPathId + ',';

        headerRecord += recodStr +'\n';
        samples.add(headerRecord);
    }
    catch(e){
        console.log(e)
        //NDListener.logBCIError(Server.TestRunIDValue, "NDHttpCapture", "dumpMappingOfHdrNameIdWithValue", "Exception occured in dumpMappingOfHdrNameIdWithValue.....", e);
    }
}

NDHttpCaptureSettings.appendHeaderNameIdAndValueId = function(headerNameId, headerValueId,recordType,headerRecordStr,flowpath){
    //if(d1.headerNameValueId && d1.headerNameValueId.length +20 >= '16384' && d1.headerNameValueId.length>0){
    if(headerRecordStr && headerRecordStr.length +20 >= MAX_RECORD_VALUE_LENGTH &&headerRecordStr.length >0){
        if(recordType == 12)
            this.dumpMappingOfHdrNameIdWithValue(true,headerRecordStr,flowpath);
        else if(recordType == 13)
            this.dumpMappingOfHdrNameIdWithValue(false,headerRecordStr,flowpath);

        //d1.headerNameValueId='';
        headerRecordStr=''
    }
    return headerRecordStr += headerNameId +':'+ headerValueId +'|'
//d1.headerNameValueId += headerNameId +':'+headerValueId +'|';
}

NDHttpCaptureSettings.encodeURL = function(header,maxlength) {
    if((maxlength != 0) && (header.length > maxlength))
        header = header.substring(0, maxlength); // truncating the string upto maxLength

    return encodeURIComponent(header); // returning the url encoded String.
}

module.exports=NDHttpCaptureSettings;