/**
 * Created by netstorm on 4/15/17.
 */

var util = require('../util'),
    agentSetting = require('../agent-setting'),
    sessionAttrMap = new Object();
function NDSessionCaptureSettings(){}
NDSessionCaptureSettings.isSpecficSessionCapturing = false;
NDSessionCaptureSettings.isSpecficCustomHeaderCapturing = false;

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
            NDSessionCaptureSettings.isSpecficSessionCapturing = true;  // For dumping all attribute set true.
            ++validLineCounts;
            var hdrName = allFields[1];
            var dumpMode = parseInt(allFields[2]);

            if(dumpMode == 2)//all
                saveConfigInMap(hdrName,dumpMode);
            else
                saveConfigInMap(hdrName,dumpMode,allFields[3]); // Method is responsible for putting all fields in

        }
    }
}

function saveConfigInMap(attrName,dumpMode,attrValue){
    var sessionData = new Object();
    var sessionAttrDataArray = []
    sessionData.dumpMode = dumpMode
    if(!attrValue) {
        sessionAttrDataArray.push(sessionData)
        sessionAttrMap[attrName]=sessionAttrDataArray
        return;
    }
    var allFieldNameVales = attrValue.split(';');

    for(var i in allFieldNameVales) {
        var curr = allFieldNameVales[i]
        sessionAttrDataArray.push(putListInSessionObj(dumpMode,attrValue,sessionData))
    }
    sessionAttrMap[attrName]=sessionAttrDataArray;
}

function putListInSessionObj(dumpMode,attrValue,sessionData){
    var attrNameArray = attrValue.split(':')
    sessionData.dumpMode = dumpMode;
    sessionData.name = attrNameArray[0];
    sessionData.type = attrNameArray[1];
    var left = decodeURIComponent(attrNameArray[2]),
        right = decodeURIComponent(attrNameArray[3])
    if(left !== 'NA')
        sessionData.leftBound = attrNameArray[2];
    if(right !== 'NA')
    sessionData.rightBound = attrNameArray[3];
    return sessionData;
}
module.exports=NDSessionCaptureSettings;