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

threshold.getDefaultThreshold = function(){
    var defaultThreshold = {}; // = new threshold(3000, 5000,1,10,20);
	defaultThreshold.slowThresholds = 3000;
	defaultThreshold.verySlowThresholds = 5000;
    return defaultThreshold;
}



module.exports = threshold;
