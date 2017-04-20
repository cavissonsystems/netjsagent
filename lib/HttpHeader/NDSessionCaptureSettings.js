/**
 * Created by Sahil on 4/15/17.
 */

var util = require('../util'),
    agentSetting = require('../agent-setting'),
    sessionAttrMap = new Object();
function NDSessionCaptureSettings(){}
NDSessionCaptureSettings.isSpecficSessionCapturing = false;
NDSessionCaptureSettings.isSpecficCustomHeaderCapturing = false;
NDSessionCaptureSettings.sessionAttrCapturing = false;
NDSessionCaptureSettings.customHeaderCapturing = false;

NDSessionCaptureSettings.parseCustomData=function(list){
    try {
        var currLine,
            customDataFromSession=[],
            customDataFromHeader=[]
        if (!list)
            return

        for(var i in list) {
            if (list[i].length == 0 || (list[i].toString().trim().startsWith("#")) || (list[i].toString().trim().startsWith(" ")))
                continue;
            currLine = list[i];
            if(currLine.startsWith("SESS_ATTR|"))
                customDataFromSession.push(currLine);
            else if(currLine.startsWith("HTTP_REQ_HDR|"))
                customDataFromHeader.push(currLine);
        }
        if(customDataFromSession.length >0) {
            NDSessionCaptureSettings.setHttpSessionAttrList(customDataFromSession)
        }
        if(customDataFromHeader.length >0) {
            NDSessionCaptureSettings.setHttpHeaderAttrList(customDataFromHeader)
        }
    }
    catch(err){
        NDSessionCaptureSettings.sessionAttrCapturing =false;
        util.logger.warn(agentSetting.currentTestRun , "| Error in parsing customCaptureData file : ",err)
    }
}

NDSessionCaptureSettings.setHttpSessionAttrList = function(customDataFromSession){
    if(!customDataFromSession)
        return;
    var validLineCounts = 0;
    for(i in  customDataFromSession){
        var currLine = customDataFromSession[i]
        if(currLine.startsWith("SESS_ATTR|All") || currLine.startsWith("SESS_ATTR|ALL") || currLine.startsWith("SESS_ATTR|all")) {
            ++validLineCounts;
        }
        else {
            var allFields = currLine.split('|');
            if(4 > allFields.length) {
                util.logger.error(agentSetting.currentTestRun, "| Current line is found invalid. it should be have atleast 3 fields");
                continue;
            }
            NDSessionCaptureSettings.isSpecficSessionCapturing = true;  // For dumping all attribute set true.
            ++validLineCounts;
            var attrName = allFields[1];
            var dumpMode = parseInt(allFields[2]);

            if(dumpMode == 2)//all
                saveConfigInMap(attrName,dumpMode);
            else
                saveConfigInMap(attrName,dumpMode,allFields[3]); // Method is responsible for putting all fields in

        }
    }
    if(validLineCounts >0)
        NDSessionCaptureSettings.sessionAttrCapturing =true;
}

NDSessionCaptureSettings.setHttpHeaderAttrList = function(customDataFromHeader){
    var validLineCounts = 0;
    for(i in  customDataFromHeader){
        var currLine = customDataFromHeader[i]
        if(currLine.startsWith("HTTP_REQ_HDR|All") || currLine.startsWith("HTTP_REQ_HDR|ALL") || currLine.startsWith("HTTP_REQ_HDR|all")) {
            ++validLineCounts;
        }
        else {
            var allFields = currLine.split('|');
            if(4 > allFields.length) {
                util.logger.error(agentSetting.currentTestRun, "| Current line is found invalid. it should be have atleast 3 fields");
                continue;
            }
            NDSessionCaptureSettings.isSpecficCustomHeaderCapturing = true;  // For dumping all attribute set true.
            ++validLineCounts;
            var hdrName = allFields[1].toLowerCase();
            var dumpMode = parseInt(allFields[2]);

            if(dumpMode == 2)//all
                saveConfigInMap(hdrName,dumpMode);
            else
                saveConfigInMap(hdrName,dumpMode,allFields[3]); // Method is responsible for putting all fields in

        }
    }
    if(validLineCounts >0)
        NDSessionCaptureSettings.customHeaderCapturing =true;
}

NDSessionCaptureSettings.getHeaderData=function(header){
    return sessionAttrMap[header]
}
NDSessionCaptureSettings.resetValues=function(){
    sessionAttrMap = new Object();
    NDSessionCaptureSettings.isSpecficSessionCapturing = false;
    NDSessionCaptureSettings.isSpecficCustomHeaderCapturing = false;
    NDSessionCaptureSettings.sessionAttrCapturing = false;
    NDSessionCaptureSettings.customHeaderCapturing = false;
}

function saveConfigInMap(attrName,dumpMode,attrValue){
    var sessionAttrDataArray = [],
        obj;
    if(!attrValue) {
        obj = putListInSessionObj(dumpMode)
        sessionAttrDataArray.push(obj)
        sessionAttrMap[attrName]=sessionAttrDataArray
        return;
    }
    var allFieldNameVales = attrValue.split(';');
    for(var i in allFieldNameVales) {
        obj =putListInSessionObj(dumpMode,allFieldNameVales[i])
        sessionAttrDataArray.push(obj)
    }
    sessionAttrMap[attrName]=sessionAttrDataArray;
}

function putListInSessionObj(dumpMode,attrValue){
    var sessionData = new Object(),
        attrNameArray;
    sessionData.dumpMode = dumpMode
    if(attrValue) {
        attrNameArray = attrValue.split(':')
        sessionData.name = attrNameArray[0];
        sessionData.type = attrNameArray[1];
        var left = decodeURIComponent(attrNameArray[2]),
            right = decodeURIComponent(attrNameArray[3])
        if (left !== 'NA')
            sessionData.leftBound = left;
        if (right !== 'NA')
            sessionData.rightBound = right;
    }
    return sessionData;
}
module.exports=NDSessionCaptureSettings;