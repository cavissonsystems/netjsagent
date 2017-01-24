/**
 * Created by Siddhant on 17-08-2015.
 */

var agentSetting = require('./agent-setting');

function categoryHandler(){}

categoryHandler.getCategory = function(statusCode,respTime,threshold, dynamicSlowThresold, dynamicVerySlowThresold){
	if(dynamicSlowThresold > 0 && agentSetting.dynamicThreshold){
        if(statusCode>=400)
            return 13;
        else if (respTime < dynamicSlowThresold) {
            return 10;
        } else if (respTime > dynamicSlowThresold && respTime < dynamicVerySlowThresold) {
            return 11;
        } else if(respTime > threshold.verySlowThresholds) {
            return 12;
        }
	}
	else{
        if(statusCode>=400)
            return 13;
        else if (respTime <= threshold.slowThresholds) {
            return 10;
        } else if (respTime > threshold.slowThresholds && respTime <= threshold.verySlowThresholds) {
            return 11;
        } else if(respTime > threshold.verySlowThresholds) {
            return 12;
        }
	}
}

module.exports = categoryHandler;
