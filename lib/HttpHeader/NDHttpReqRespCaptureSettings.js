/**
 * Created by Sahil on 3/24/17.
 */
var ND_HTTP_CAPTURE_HDR_MODE_ALL  = 0,
    ND_HTTP_CAPTURE_HDR_MODE_CONFIGURED  = 2,
    ND_HTTP_CAPTURE_HDR_MODE_SPECIFIED  = 1,
    HDR_VALUE_LENGTH_MODE_COMPLETE = 0,
    HDR_VALUE_LENGTH_MODE_BRIEF = 1;

function NDHttpReqRespCaptureSettings(){
    this.captureLevel = 0;              // 0-disable, 1-URL only, 2-URL with parameters, 3-URL with parameters and HTTP headers
    this.hdrMode = ND_HTTP_CAPTURE_HDR_MODE_ALL;        // ALL or CONFIGURED or specified comma separated header names
    this.hdrValueLengthMode = HDR_VALUE_LENGTH_MODE_COMPLETE;
    this.hdrValueMaxLength=8            // max length of the header value

    this.hdrNameList=[]
}

NDHttpReqRespCaptureSettings.prototype.setCaptureLevel= function(captureLevel, httpType,isRequest){
    try {
        var intCaptureLevel = parseInt(captureLevel);

        if(isRequest && (intCaptureLevel >= 0 && intCaptureLevel <= 3)) {// checking for request, capture level will be 0,1,2,3.
            this.captureLevel = intCaptureLevel;
            //if(httpCaptureTraceLevel > 1)
            //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpReqRespCaptureSettings: Setting httpCaptureLevel for " + httpLeveltype + ". Value = " + intCaptureLevel + ".");
            return true;
        }
        else if(!isRequest && (intCaptureLevel >= 0 && intCaptureLevel <= 2)) {// checking for response, capture level will be 0,1,2.
            this.captureLevel = intCaptureLevel;
            //if(httpCaptureTraceLevel > 1)
            //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpReqRespCaptureSettings: Setting httpCaptureLevel for " + httpLeveltype + ". Value = " + intCaptureLevel + ".");
            return true;
        }
        else {
            //if(httpCaptureTraceLevel > 1)
            //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpReqRespCaptureSettings: Not Setting httpCaptureLevel for " + httpLeveltype + ", as value is less than 0. Value = " + intCaptureLevel + ".");
            return false;
        }
    }
    catch(e){
        console.log(e)
        //NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpReqRespCaptureSettings: Error in setting httpCaptureLevel for " + httpLeveltype + ", due to exception = " + e + ". Received value=" + captureLevel + ".");
        //NDListener.logBCIError(Server.TestRunIDValue, "NDHttpReqRespCaptureSettings", "setCaptureLevel", "NDHttpReqRespCaptureSettings: Error in setting httpCaptureLevel for " + httpLeveltype + ", due to exception = " + e + ". Received value=" + captureLevel + ".",e);
        return false;
    }
}
NDHttpReqRespCaptureSettings.prototype.setHdrMode= function(hdrModeVal, httpType){
    try
    {
        if(hdrModeVal.toUpperCase() == 'ALL') {
            this.hdrMode = ND_HTTP_CAPTURE_HDR_MODE_ALL;
            //if(httpCaptureTraceLevel > 1)
            //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpReqRespCaptureSettings: Setting httpCaptureHdrList for " + httpLeveltype + ". Value = " + hdrModeVal + ".");
            return true;
        }
        else if("CONFIGURED" == hdrModeVal.toUpperCase()) {
            this.hdrMode = ND_HTTP_CAPTURE_HDR_MODE_CONFIGURED;
            //if(httpCaptureTraceLevel > 1)
            //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpReqRespCaptureSettings: Setting httpCaptureHdrList for " + httpLeveltype + ". Value = " + hdrModeVal + ".");
            return true;
        }
        else {
            this.hdrMode = ND_HTTP_CAPTURE_HDR_MODE_SPECIFIED;
            var hdrList = hdrModeVal.split(",");
            this.hdrNameList = [];
            for(var i = 0; i < hdrList.length; i++) {
                var add = checkAndAdd(this.hdrNameList,hdrList[i])
                if(add)
                    this.hdrNameList.push(hdrList[i].toLowerCase())    //Converting header name in lower case , because in http request ,headers are in lower case
            }
            //if(httpCaptureTraceLevel > 1)
            //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpReqRespCaptureSettings: Setting httpCaptureHdrList for " + httpLeveltype + ". Value = " + hdrModeVal + ".");
            return true;
        }
    }
    catch(e) {
        console.log(e)
        //NDListener.logBCIError(Server.TestRunIDValue, "NDHttpReqRespCaptureSettings", "setCaptureLevel", "Error in setting httpCapturehdrlist for " + httpLeveltype + ", due to exception = " + e + ". Received value=" + hdrModeVal + ".",e);
        return false;
    }
}
NDHttpReqRespCaptureSettings.prototype.setHdrValueLengthMode= function(hdrValueLengthMode, httpType){
    try {
        var byteHdrValueLengthMode = hdrValueLengthMode;

        if(byteHdrValueLengthMode == HDR_VALUE_LENGTH_MODE_COMPLETE || byteHdrValueLengthMode == HDR_VALUE_LENGTH_MODE_BRIEF) {
            this.hdrValueLengthMode = byteHdrValueLengthMode;
            //if(httpCaptureTraceLevel > 1)
            //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpReqRespCaptureSettings: Setting httpCaptureHdrValueLengthMode for " + httpLeveltype + ". Value = " + hdrValueLengthMode + ".");
            return true;
        }
        else {
            //if(httpCaptureTraceLevel > 1)
            //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpReqRespCaptureSettings: Not Setting httpCaptureHdrValueLengthMode for " + httpLeveltype + ", as value is greater than 1. Value = " + hdrValueLengthMode + ".");
            return false;
        }
    }
    catch(e){
        console.log(e)
        //NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpReqRespCaptureSettings: Error in setting httpCaptureHdrValueLengthMode for " + httpLeveltype + ", due to exception = " + e + ". Received value=" + hdrValueLengthMode + ".");
        //NDListener.logBCIError(Server.TestRunIDValue, "NDHttpReqRespCaptureSettings", "setHdrValueLengthMode", "NDHttpReqRespCaptureSettings: Error in setting httpCaptureHdrValueLengthMode for " + httpLeveltype + ", due to exception = " + e + ". Received value=" + hdrValueLengthMode + ".");
        return false;
    }
}
NDHttpReqRespCaptureSettings.prototype.setHdrValueMaxLength= function(hdrValueMaxLength, httpType){
    try {
        var intHdrValueMaxLength = parseInt(hdrValueMaxLength);
        if(intHdrValueMaxLength > 0) {
            this.hdrValueMaxLength = intHdrValueMaxLength;
            //if(httpCaptureTraceLevel > 1)
            //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpReqRespCaptureSettings: Setting httpCaptureHdrValueMaxLength for " + httpLeveltype + ". Value = " + hdrValueMaxLength + ".");
            return true;
        }
        else {
            //if(httpCaptureTraceLevel > 1)
            //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "NDHttpReqRespCaptureSettings: Not Setting httpCaptureHdrValueMaxLength for " + httpLeveltype + ", as value is less than or equal to 0. Value = " + hdrValueMaxLength + ".");
            return false;
        }
    }
    catch(e){
        console.log(e)
        //NDListener.logBCIError(Server.TestRunIDValue, "NDHttpReqRespCaptureSettings", "setHdrValueMaxLength", "Error in setting httpCaptureHdrValueMaxLength for " + httpLeveltype + ". Received value=" + hdrValueMaxLength + ".", e);
        return false;
    }
}

function checkAndAdd(array,value){
    for(i in array) {
        if(array[i]==value)
            return false
    }
    return true
}

module.exports = NDHttpReqRespCaptureSettings;
