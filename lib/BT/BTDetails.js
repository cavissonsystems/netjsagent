/**
 * Created by Siddhant on 11-09-2015.
 */

function BTDetails(){
    this.minDuration = Number.MAX_VALUE;
    this.maxDuration = 0;
    this.duration = 0;

    this.minNormalDuration = Number.MAX_VALUE;
    this.maxNormalDuration = 0;
    this.normalDuration = 0;

    this.minSlowDuration = Number.MAX_VALUE;
    this.maxSlowDuration = 0;
    this.slowDuration = 0;

    this.minVerySlowDuration = Number.MAX_VALUE;
    this.maxVerySlowDuration = 0;
    this.verySlowDuration = 0;

    this.NormalCount = 0;
    this.SlowCount = 0;
    this.VerySlowCount = 0;
    this.count = 0;

    this.errorCount = 0;
    this.minErrorDuration = Number.MAX_VALUE;
    this.maxErrorDuration = 0;
    this.errorDuration = 0;

    this.reqPerSecond = 0;
    this.avgRespTime = 0;
    this.errorsPerSecond = 0;
    this.normalAvgRespTime = 0;
    this.slowAvgRespTime = 0;
    this.verySlowAvgRespTime = 0;
    this.errorsAvgRespTime = 0;
    this.slowAndVerySlowPct = 0;
}

BTDetails.prototype.createBTRecord = function (BTID, BTName, duration,cat,statusCode) {

    this.BTName = BTName;
    this.duration = duration;
    this.AvgResTime = duration;
    this.count = this.count + 1;
    this.commonCalculation(duration,cat,statusCode);
}

BTDetails.prototype.updateBTDetail = function (duration,cat,statusCode) {
    this.duration = this.duration + duration;
    this.count = this.count + 1;
    this.commonCalculation(duration,cat,statusCode);
}

BTDetails.prototype.init = function(){

    this.normalAvgRespTime =0;
    this.reqPerSecond = 0;
    this.count = 0;
    this.avgRespTime = 0;
    this.NormalCount =0;
    this.slowCount = 0;
    this.verySlowCount = 0;
    this.errorCount = 0;
    this.verySlowAvgRespTime =0;
    this.slowAvgRespTime =0;
    this.slowAndVerySlowPct = 0;
        //resetting normal counter
    this.minDuration = Number.MAX_VALUE;
    this.maxDuration = 0; //Must be set to 0 so that check for max becomes easy
        // Reset all others to 0.
    this.duration = 0;


        //resetting all bt cpu time counters
    this.minCpuTime = Number.MAX_VALUE;
    this.maxCpuTime = 0;
    this.cpuTime = 0;

        //resetting slow counters
    this.minSlowDuration = Number.MAX_VALUE;
    this.maxSlowDuration = 0; //Must be set to 0 so that check for max becomes easy
        // Reset all others to 0.
    this.slowDuration = 0;

        //resetting normal counters
        // Initially minDuration is assigned Maximum Value as the minimum cannot have more than that value.
    this.minNormalDuration = Number.MAX_VALUE;
    this.maxNormalDuration = 0; //Must be set to 0 so that check for max becomes easy
        // Reset all others to 0.
    this.normalDuration = 0;

        //resetting very slow counters
    this.minVerySlowDuration = Number.MAX_VALUE;
    this.maxVerySlowDuration = 0; //Must be set to 0 so that check for max becomes easy
        // Reset all others to 0.
    this.verySlowDuration = 0;

        //resetting error counters
        // Initially minDuration is assigned Maximum Value as the minimum cannot have more than that value.
    this.maxErrorDuration = Number.MAX_VALUE;
    this.maxErrorDuration = 0; //Must be set to 0 so that check for max becomes easy
        // Reset all others to 0.
    this.errorDuration = 0;
    this.errorsAvgRespTime =0;
    this.errorsPerSecond = 0;
}

BTDetails.prototype.commonCalculation = function(duration,cat,statusCode){
    if(statusCode >= 400){
        if (duration < this.minErrorDuration) {
            this.minErrorDuration = duration;
        }
        if (duration > this.maxErrorDuration) {
            this.maxErrorDuration = duration;
        }
        this.errorDuration += duration;
        this.errorCount = this.errorCount + 1;
    }

    if (cat == 10) {
        if (duration < this.minNormalDuration) {
            this.minNormalDuration = duration;
        }
        if (duration > this.maxNormalDuration) {
            this.maxNormalDuration = duration;
        }
        this.normalDuration += duration;
        this.NormalCount = this.NormalCount + 1;

    } else if (cat == 11) {
        if (duration < this.minSlowDuration) {
            this.minSlowDuration = duration;
        }

        if (duration > this.maxSlowDuration) {
            this.maxSlowDuration = duration;
        }
        this.slowDuration += duration;
        this.SlowCount = this.SlowCount + 1;
    } else {
        if (duration < this.minVerySlowDuration) {
            this.minVerySlowDuration = duration;
        }

        if (duration > this.maxVerySlowDuration) {
            this.maxVerySlowDuration = duration;
        }
        this.verySlowDuration += duration;
        this.VerySlowCount = this.VerySlowCount + 1;
    }
    if (duration < this.minDuration) {
        this.minDuration = duration;
    }

    if (duration > this.maxDuration) {
        this.maxDuration = duration;
    }
    return this;
}

BTDetails.prototype.updateOverAllBTDetail = function (valu) {
    this.BTID = 0;
    this.BTName = 'AllTransactions';
    this.duration = this.duration + valu.duration;
    this.normalDuration = this.normalDuration + valu.normalDuration;
    this.slowDuration = this.slowDuration + valu.slowDuration;
    this.verySlowDuration = this.verySlowDuration + valu.verySlowDuration;
    this.count = this.count + valu.count;
    this.NormalCount = this.NormalCount + valu.NormalCount;
    this.SlowCount = this.SlowCount + valu.SlowCount;
    this.VerySlowCount = this.VerySlowCount + valu.VerySlowCount;
    this.errorCount = this.errorCount + valu.errorCount;
    this.reqPerSecond = this.count / 30;

    if (this.count > 0)
    {
        //TODO : There should be monitorIntervalTime in place of 30
        this.reqPerSecond = this.count / 30;    // 30 is setInterval time for eachBTDataing data
        this.avgRespTime = this.duration / this.count;
        this.slowAndVerySlowPct = ( ((this.SlowCount + this.VerySlowCount) * 100) / this.count);
    }

    if (this.errorCount > 0)
    {
        this.errorsPerSecond = this.errorCount / 30;
        this.errorsAvgRespTime = this.errorDuration / this.errorCount;
    }

    if (this.SlowCount > 0)
    {
        this.slowAvgRespTime = this.slowDuration / this.SlowCount;
    }

    if (this.NormalCount > 0)
    {
        this.normalAvgRespTime = this.normalDuration / this.NormalCount;
    }

    if (this.VerySlowCount > 0)
    {
        this.verySlowAvgRespTime = this.verySlowDuration / this.VerySlowCount;
    }

    if (valu.minErrorDuration < this.minErrorDuration) {
        this.minErrorDuration = valu.minErrorDuration;
    }
    if (valu.maxErrorDuration > this.maxErrorDuration) {
        this.maxErrorDuration = valu.maxErrorDuration;
    }

    if (valu.minDuration < this.minDuration) {
        this.minDuration = valu.minDuration;
    }
    if (valu.maxDuration > this.maxDuration) {
        this.maxDuration = valu.maxDuration;
    }

    if (valu.minNormalDuration < this.minNormalDuration) {
        this.minNormalDuration = valu.minNormalDuration;
    }
    if (valu.maxNormalDuration > this.maxNormalDuration) {
        this.maxNormalDuration = valu.maxNormalDuration;
    }

    if (valu.minSlowDuration < this.minSlowDuration) {
        this.minSlowDuration = valu. minSlowDuration;
    }
    if (valu.maxSlowDuration > this.maxSlowDuration) {
        this.maxSlowDuration = valu.maxSlowDuration;
    }

    if (valu.minVerySlowDuration < this.minVerySlowDuration) {
        this.minVerySlowDuration = valu.minVerySlowDuration;
    }
    if (valu.maxVerySlowDuration > this.maxVerySlowDuration) {
        this.maxVerySlowDuration = valu.maxVerySlowDuration;
    }
        return this;

}


module.exports = BTDetails;
