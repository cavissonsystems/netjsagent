/**
 * Created by Harendra Kumar on 10/7/2016.
 */
var asSettingObj = require('./autoSensor/autoSensorSetting');
var asMonitorObj = require('./autoSensor/autoSensorMonitor');
function OtherKeywordhandler(){

}
OtherKeywordhandler.parsingKeywordvalue = function (clientMsg) {

    var allFields = clientMsg;
    for (var i = 0; i < allFields.length; i++)
    {
        if (allFields[i].toString().startsWith("ASSampleInterval=") || allFields[i].toString().indexOf("ASSampleInterval") > -1 ){
            asSettingObj.asSampleInterval  = allFields[i].toString().split("=")[1];
        }
        else if(allFields[i].toString().startsWith("ASReportInterval=") || allFields[i].toString().indexOf("ASReportInterval") > -1 ){
            asSettingObj.asReportInterval = allFields[i].toString().split("=")[1];
        }
        else if(allFields[i].toString().startsWith("ASStackComparingDepth=") || allFields[i].toString().indexOf("ASStackComparingDepth") > -1 ){
            asSettingObj.asStackComparingDepth = allFields[i].toString().split("=")[1];
        }
        else if(allFields[i].toString().startsWith("ASDepthFilter=") || allFields[i].toString().indexOf("ASDepthFilter") > -1 ){
            asSettingObj.asDepthFilter = allFields[i].toString().split("=")[1];
        }
        else if(allFields[i].toString().startsWith("genNewMonRecord=") || allFields[i].toString().indexOf("genNewMonRecord") > -1 ){

            var keywordArray = allFields[i].toString().split("=");
            try {
                asMonitorObj.sendThreadSummaryReport(keywordArray[1]);
            }
            catch(err)
            {
                asMonitorObj.sendThreadSummaryReport(0);
            }
        }
        else if(allFields[i].toString().startsWith("ASThresholdMatchCount=") || allFields[i].toString().indexOf("ASThresholdMatchCount") > -1 ){
            asSettingObj.asThresholdMatchCount = allFields[i].toString().split("=")[1];
        }
    }
}


module.exports = OtherKeywordhandler;
