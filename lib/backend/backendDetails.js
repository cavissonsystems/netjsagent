/**
 * Created by Siddhant on 22-09-2015.
 */
var util = require('../util');

function BackendDetails(){
    this.BackendName;

    this.minDuration = Number.MAX_VALUE;
    this.maxDuration = 0;

    this.sumDuration = 0;
    this.avgDuration = 0;


    this.cumCount = 0;
    this.errorCumCount = 0;
    this.invocationCount = 0;
    this.errorInvocationCount = 0;

    this.rate = 0;

    //Network Delay in Req.
    this.sumNetworkDelayInRequest = 0;
    this.avgNetworkDelayInRequest = 0;
    this.minNetworkDelayInRequest = Number.MAX_VALUE;
    this.maxNetworkDelayInRequest = 0;

    //Network Delay in Res.
    this.sumNetworkDelayInResponse = 0;
    this.avgNetworkDelayInResponse = 0;
    this.minNetworkDelayInResponse = Number.MAX_VALUE;
    this.maxNetworkDelayInResponse = 0;
    //this.errorRate = 0;
}

/*
BackendDetails.prototype.create5record = function (BackendName,backendID ) {
    return '5' + ',' + this.BackendName + ',' + this.backendID +"\n";
}
*/


BackendDetails.prototype.createBackendRecord = function (status,duration,backendName,backendID,netReqDelay,netResDelay) {
    this.BackendName = backendName;
    this.backendID = backendID;

    this.commonCalculation(status,duration,netReqDelay,netResDelay);

}

BackendDetails.prototype.updateBackendDetails = function (status,duration,netReqDelay,netResDelay) {

    this.commonCalculation(status,duration,netReqDelay,netResDelay);
}

BackendDetails.prototype.commonCalculation = function(status,duration,netReqDelay,netResDelay){
    try {
        if (status >= 400){
			this.errorCumCount = this.errorCumCount + 1;
            this.errorInvocationCount = this.errorInvocationCount + 1;
        }
        if (duration < this.minDuration) {
            this.minDuration = duration;
        }
        if (duration > this.maxDuration) {
            this.maxDuration = duration;
        }

        this.cumCount = this.cumCount + 1;
        this.invocationCount = this.invocationCount + 1;

        this.sumDuration = this.sumDuration + duration;
        this.avgDuration = this.sumDuration / this.invocationCount;

        //Network Delay in Req.
        if(netReqDelay >= 0){
            if (netReqDelay < this.minNetworkDelayInRequest) {
                this.minNetworkDelayInRequest = netReqDelay;
            }
            if (netReqDelay > this.maxNetworkDelayInRequest) {
                this.maxNetworkDelayInRequest = netReqDelay;
            }
            this.sumNetworkDelayInRequest = this.sumNetworkDelayInRequest + netReqDelay;
            this.avgNetworkDelayInRequest = this.sumNetworkDelayInRequest / this.invocationCount;
        }
        
        //Network Delay in Res.
        if(netResDelay >= 0){
            if (netResDelay < this.minNetworkDelayInResponse) {
                this.minNetworkDelayInResponse = netResDelay;
            }
            if (netResDelay > this.maxNetworkDelayInResponse) {
                this.maxNetworkDelayInResponse = netResDelay;
            }
            this.sumNetworkDelayInResponse = this.sumNetworkDelayInResponse + netResDelay;
            this.avgNetworkDelayInResponse = this.sumNetworkDelayInResponse / this.invocationCount;
        }

    }catch(err){
        util.logger.warn("Error while making backend details : "+err);
    }

        return this;
}


module.exports = BackendDetails;
