/*
* Author: Kumar Shivam
* Filename: handleFPWithForce
* Initial Version: 1
* Description: For forcefully dumping 2 and 4 records after specific time given by NDC.
*/

var samples = require('./../nodetime/lib/samples.js');
var util = require('./../util');

function handleFPWithForce(){}

function getThresholdValue(agentSetting){
    try{
        var flowMapSize = Object.keys(agentSetting.flowMap).length;
        util.logger.info(agentSetting.currentTestRun + " | Size of flowMap is : " + flowMapSize);
        agentSetting.forceFPThresholdValue = Math.trunc(0.05 * flowMapSize);
        if(agentSetting.forceFPThresholdValue == 0){
            agentSetting.forceFPThresholdValue=20;
        }
        else if(agentSetting.forceFPThresholdValue > 100){
            agentSetting.forceFPThresholdValue = 100;
        }
    }catch(er){
        agentSetting.forceFPThresholdValue = 20;
        util.logger.error(agentSetting.currentTestRun + " | Error occured during calculating the forceFPThresholdValue : "+er);
    }

}

handleFPWithForce.dumpFPForcefully = function(agentSetting){
    if (!agentSetting.dumpFPForcefullyTimer) {
        getThresholdValue(agentSetting);
        agentSetting.dumpFPForcefullyTimer = setInterval(function() {
            try {
                var currTime = new Date().getTime();
                var endTime = currTime - agentSetting.cavEpochDiffInMills;
                var fpObjMap = agentSetting.flowMap;

                for (var i in fpObjMap) {
                    var currFPObj = fpObjMap[i];
                    if (!currFPObj) continue;
                    var respTime = endTime - currFPObj.timeInMillis;
                    if (respTime > agentSetting.FPMaxAllowedAgeInMillis) {
                        if (!currFPObj.flowpathHdrDump) {
                            var encoded2_record = currFPObj.generate_2_record();
                            samples.add(encoded2_record);
                            currFPObj.statusCode = 0;
                            currFPObj.category = 12;
                            currFPObj.respTime = respTime;
                            var encoded4_record = currFPObj.generate_4_record();
                            samples.add(encoded4_record);
                            util.logger.info(agentSetting.currentTestRun, " | Dumping 2 and 4 record forcefully for fpId " + i);
                        } else {
                            currFPObj.statusCode = 0;
                            currFPObj.category = 12;
                            currFPObj.respTime = respTime;
                            var encoded4_record = currFPObj.generate_4_record();
                            samples.add(encoded4_record);
                            util.logger.info(agentSetting.currentTestRun, " | Dumping 4 record with statusCode-0, forcefully for fpId " + i);
                        }

                        delete agentSetting.flowMap[i];
                    }
                    if (((new Date().getTime()) - currTime) > agentSetting.forceFPThresholdValue)
                        break;
                }

            } catch (er) {
                util.logger.error(agentSetting.currentTestRun, " | Error occurred when forcefully dumping 2 or 4 record ....", er);
                try {
                    delete agentSetting.flowMap[i];
                } catch (err) {
                    util.logger.error(agentSetting.currentTestRun, " | function dumpFPForcefully - error occurred while deleting fp object from map.", err);
                }
            }
        }, agentSetting.forceFPDumpInterval);
    }
}


module.exports=handleFPWithForce;