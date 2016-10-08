/**
 * Created by Siddhant on 17-08-2015.
 */

var agentSetting = require('./agent-setting');

function categoryHandler(){

}


categoryHandler.getCategory = function(respTime,threshold){
    /*if(agentSetting.categoryMap[url] == undefined){
        url = 'All';
    }

    if(respTime<agentSetting.categoryMap[url].slow){
        return 10;
    }else if(respTime>agentSetting.categoryMap[url].slow && respTime<agentSetting.categoryMap[url].vryslow){
        return 11;
    }else{
        return 12;
    }*/
	if (respTime < threshold.slowThresholds) {
            return 10;

        } else if (respTime > threshold.slowThresholds && respTime < threshold.verySlowThresholds) {
            return 11;
        } else {
            return 12;
        }
}

module.exports = categoryHandler;
