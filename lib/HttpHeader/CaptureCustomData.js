/**
 * Created by Sahil on 4/14/17.
 */

var util = require('../util'),
    agentSetting = require('../agent-setting'),
    NDSessionCaptureSettings = require('./NDSessionCaptureSettings')

function CaptureCustomData(){}
CaptureCustomData.isSessionAttrCapturingEnabled = false;

CaptureCustomData.parseCustomData=function(list){
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
        CaptureCustomData.isSessionAttrCapturingEnabled = false;
        util.logger.warn(agentSetting.currentTestRun , "| Error in parsing customCaptureData file : ",err)
    }
}
CaptureCustomData.resetValues=function(){

}
CaptureCustomData.resetValues=function(){

}

module.exports= CaptureCustomData;