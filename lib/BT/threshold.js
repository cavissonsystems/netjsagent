/**
 * Created by Siddhant on 25-09-2016.
 */

function threshold (slowThresold,verySlowThresold) {
    this.slowThresholds = slowThresold;
    this.verySlowThresholds = verySlowThresold;
}

threshold.prototype.getSlowThresholds = function()
{
    return this.slowThresholds;
}

threshold.prototype.setSlowThresholds = function(slowThresholds)
{
    this.slowThresholds = slowThresholds;
}

threshold.prototype.getVerySlowThresholds = function()
{
    return this.verySlowThresholds;
}

threshold.prototype.setVerySlowThresholds = function(verySlowThresholds)
{
    this.verySlowThresholds = verySlowThresholds;
}

threshold.getDefaultThreshold = function(){
    var defaultThreshold = new threshold(3000, 5000);
    return defaultThreshold;
}



module.exports = threshold;