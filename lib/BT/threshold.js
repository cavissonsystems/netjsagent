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

threshold.prototype.getDynamicSlowThresoldPct = function()
{
	if(this.dynamicSlowThresholdPct)
		return this.dynamicSlowThresholdPct;
	else
	    return 0;
}

threshold.prototype.getDynamicVSlowThresoldPct = function()
{
	if(this.dynamicVSlowThresholdPct)
		return this.dynamicVSlowThresholdPct;
	else
	    return 0;
}

threshold.prototype.getdynamicThresholdMethod = function()
{
	if(this.dynamicThresholdMethod)
		 return this.dynamicThresholdMethod;
	else
	    return 0;
}

threshold.prototype.setDynamicSlowThresoldPct = function(dynamicSlowThresholdPct)
{
    this.dynamicSlowThresholdPct = dynamicSlowThresholdPct;
}

threshold.prototype.setDynamicVSlowThresoldPct = function(dynamicVSlowThresholdPct)
{
    this.dynamicVSlowThresholdPct = dynamicVSlowThresholdPct;
}

threshold.prototype.setdynamicThresholdMethod = function(dynamicThresholdMethod)
{
    this.dynamicThresholdMethod = dynamicThresholdMethod;
}

threshold.prototype.getDynamicSlowThresold = function()
{
	if(this.dynamicSlowThreshold)
	       return this.dynamicSlowThreshold;
	else
		   return 0;
}

threshold.prototype.setDynamicSlowThresold = function(dynamicSlowThreshold)
{
    this.dynamicSlowThreshold = dynamicSlowThreshold;
}

threshold.prototype.getDynamicVSlowThresold = function()
{
	if(this.dynamicSlowThresholdPct){
		
		return this.dynamicVSlowThreshold;
	}
	else
	   return 0;
}

threshold.prototype.setDynamicVSlowThresold = function(dynamicVSlowThreshold)
{
    this.dynamicVSlowThreshold = dynamicVSlowThreshold;
}

threshold.getDefaultThreshold = function(){
    var defaultThreshold = new threshold(3000, 5000,1,10,20);
    return defaultThreshold;
}



module.exports = threshold;
