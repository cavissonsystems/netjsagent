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

            var keywordArray = allFields[i].toString().split("=");

            asSettingObj.asSampleInterval = keywordArray[1];
        }
        else if(allFields[i].toString().startsWith("ASReportInterval=") || allFields[i].toString().indexOf("ASReportInterval") > -1 ){

            var keywordArray = allFields[i].toString().split("=");

            asSettingObj.asReportInterval = keywordArray[1];
        }
        else if(allFields[i].toString().startsWith("ASStackComparingDepth=") || allFields[i].toString().indexOf("ASStackComparingDepth") > -1 ){

            var keywordArray = allFields[i].toString().split("=");

            asSettingObj.asStackComparingDepth = keywordArray[1];
        }
        else if(allFields[i].toString().startsWith("ASDepthFilter=") || allFields[i].toString().indexOf("ASDepthFilter") > -1 ){
            var keywordArray = allFields[i].toString().split("=");

            asSettingObj.asDepthFilter = keywordArray[1];

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
            var keywordArray = allFields[i].toString().split("=");

            asSettingObj.asThresholdMatchCount = keywordArray[1];

        }
    }
}


module.exports = OtherKeywordhandler;
