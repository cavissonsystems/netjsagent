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
    this.errorRate = 0;
}

/*
BackendDetails.prototype.create5record = function (BackendName,backendID ) {
    return '5' + ',' + this.BackendName + ',' + this.backendID +"\n";
}
*/


BackendDetails.prototype.createBackendRecord = function (args,duration,backendName,backendID,methodId) {
    this.BackendName = backendName;
    this.backendID = backendID;
    this.methodId = methodId;

    this.commonCalculation(args,duration);

}

BackendDetails.prototype.updateBackendDetails = function (args,duration) {

    this.commonCalculation(args,duration);
}

BackendDetails.prototype.commonCalculation = function(args,duration){
    try {
        if (args['Status code'] == undefined ) {
            args['Status code'] == 200;
            }
        if (args['Status code'] >= 400) {
            if (duration.ms < this.minErrorDuration) {
                this.minErrorDuration = duration.ms;
            }
            if (duration.ms > this.maxErrorDuration) {
                this.maxErrorDuration = duration.ms;
            }
            this.errorInvocationCount = this.errorInvocationCount + 1;
        } else
        {
            if (duration.ms < this.minDuration) {
                this.minDuration = duration.ms;
            }
            if (duration.ms > this.maxDuration) {
                this.maxDuration = duration.ms;
            }

            this.cumCount = this.cumCount + 1;
            this.invocationCount = this.invocationCount + 1;

            this.sumDuration = this.sumDuration + duration.ms;
            this.avgDuration = this.sumDuration / this.invocationCount;


        }
    }catch(err){
        util.logger.warn("Error while making backend details : "+err);
    }

        return this;
}


module.exports = BackendDetails;
