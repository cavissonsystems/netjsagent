/**
 * Created by Harendra Kumar on 10/7/2016.
 */

ASSettings.asSampleInterval = 100;
ASSettings.asReportInterval = 12000;
ASSettings.asStackComparingDepth = 10;
ASSettings.asDepthFilter= 20;
ASSettings.asThresholdMatchCount = 5;
ASSettings.thresholdValue = 500;
if(ASSettings.asSampleInterval != undefined && ASSettings.asThresholdMatchCount != undefined) {
    ASSettings.thresholdValue = ASSettings.asThresholdMatchCount * ASSettings.asSampleInterval;
}
function ASSettings() {

}
module.exports = ASSettings;