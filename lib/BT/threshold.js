/**
 * Created by Siddhant on 25-09-2016.
 */

function threshold (slowThresold,verySlowThresold,dynamicThresholdMethod,dynamicSlowThresholdPct,dynamicVSlowThresholdPct) {
    this.slowThresholds = slowThresold;
    this.verySlowThresholds = verySlowThresold;
    //This variable added for dynamic calculation of threshold value for BT
    this.dynamicThresholdMethod = dynamicThresholdMethod;
    this.dynamicSlowThresholdPct = dynamicSlowThresholdPct;
    this.dynamicVSlowThresholdPct = dynamicVSlowThresholdPct;
    this.dynamicSlowThreshold = 0;
    this.dynamicVSlowThreshold = 0;
}

var defaultThreshold = {slowThresholds:3000,verySlowThresholds:5000};

threshold.setDefaultThreshold = function(obj){
    defaultThreshold.slowThresholds = obj.slowThresholds;
    defaultThreshold.verySlowThresholds = obj.verySlowThresholds;
}

threshold.getDefaultThreshold = function(){
    return defaultThreshold;
}

module.exports = threshold;
