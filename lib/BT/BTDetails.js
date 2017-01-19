/**
 * Created by Siddhant on 11-09-2015.
 */

function BTDetails(){
    this.minDuration = Number.MAX_VALUE;
    this.maxDuration = 0;
    this.duration = 0;
    this.count = 0;

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

    this.errorCount = 0;
    this.minErrorDuration = Number.MAX_VALUE;
    this.maxErrorDuration = 0;
    this.errorDuration = 0;

    //Adding some more variable only for manage request, these are for handle iverhead.These variable will not dumped in any record
    this.lastNRespTime = [];
    this.lastNCount = [];
    this.totRequest = 0;
    this.totReqDumpComplete = 0;
    this.lastNAvgRespTime = 0; //This will store last 5 respose time of particular BT
    this.percentageReqDumpComplete = 0;
    //These variable used for dynamic handling of slow/very slow BTs
    this.dynamicSlowThresold = 0;
    this.dynamicVSlowThresold = 0;
    this.dynamicSlowThresoldPct = 0;
    this.dynamicVSlowThresoldPct = 0;
}

BTDetails.prototype.init = function(){

    this.count = 0;
    this.NormalCount =0;
    this.slowCount = 0;
    this.verySlowCount = 0;
    this.errorCount = 0;

    //resetting normal counter
    this.minDuration = Number.MAX_VALUE;
    this.duration = 0;
    this.maxDuration = 0; //Must be set to 0 so that check for max becomes easy

    // Reset all others to 0.
    this.minSlowDuration = Number.MAX_VALUE;
    this.maxSlowDuration = 0; //Must be set to 0 so that check for max becomes easy
    this.slowDuration = 0;

    this.minCpuTime = Number.MAX_VALUE;
    this.maxCpuTime = 0;
    this.cpuTime = 0;

    // Initially minDuration is assigned Maximum Value as the minimum cannot have more than that value.
    this.minNormalDuration = Number.MAX_VALUE;
    this.maxNormalDuration = 0; //Must be set to 0 so that check for max becomes easy
    this.normalDuration = 0;

    //resetting very slow counters
    this.minVerySlowDuration = Number.MAX_VALUE;
    this.maxVerySlowDuration = 0; //Must be set to 0 so that check for max becomes easy
    this.verySlowDuration = 0;

    //resetting error counters
    // Initially minDuration is assigned Maximum Value as the minimum cannot have more than that value.
    this.minErrorDuration = Number.MAX_VALUE;
    this.maxErrorDuration = 0; //Must be set to 0 so that check for max becomes easy
    this.errorDuration = 0;
    // Reset all others to 0.
}

BTDetails.prototype.createBTRecord = function (BTID, BTName, duration,cat,statusCode, slowPct, verySlowPct) {
    this.BTName = BTName;
    if(slowPct){
    this.dynamicSlowThresoldPct = slowPct;
    this.dynamicVSlowThresoldPct = verySlowPct;
    }
    /*this.duration = duration;
    this.count = this.count + 1;
    this.commonCalculation(duration,cat,statusCode);*/
}

BTDetails.prototype.updateBTDetail = function (duration,cat,statusCode) {
    if(duration)
    this.duration = this.duration + Number(duration);
    this.count = this.count + 1;
    this.commonCalculation(duration,cat,statusCode);
}
BTDetails.prototype.updateNCounter = function ()
{
    //These data will not dump, it is used to reduce cpu overhead
    try{
    updateLastNRespTimeCounter(this.lastNRespTime,this.duration) ;
    updateLastNCounter(this.lastNCount,this.count);
    if(this.lastNRespTime.length==5 && this.lastNCount.length==5)
         this.lastNAvgRespTime = (this.lastNRespTime.reduce(add, 0)/this.lastNCount.reduce(add, 0));

    //calculating dynamic slow/very slow bt's threshold
    this.dynamicSlowThresold = parseFloat(this.lastNAvgRespTime * (100 + Number(this.dynamicSlowThresoldPct))/100).toFixed(2);
    this.dynamicVSlowThresold = parseFloat(this.lastNAvgRespTime * (100 + Number(this.dynamicVSlowThresoldPct))/100).toFixed(2);
   }
   catch(err){}
}
function add(a, b) {
    return a + b;
}
function updateLastNRespTimeCounter(counter,value)
{
 if(counter.length == 5 && value)
   {
    counter.splice(0,1);
    counter.push(value);
   }
 else if(value) 
   counter.push(value);
}

function updateLastNCounter(counter,value)
{
 if(counter.length == 5 && value)
   {
    counter.splice(0,1);
    counter.push(value);
   }
 else if(value)
   counter.push(value);
}
BTDetails.prototype.updateTotDumpReq = function () {
    this.totReqDumpComplete = this.totReqDumpComplete +1;;
}

BTDetails.prototype.updateTotalAndAvgDumpReq = function () {
    this.totRequest = this.totRequest + 1;
    this.percentageReqDumpComplete = (this.totReqDumpComplete * 100) / this.totRequest;
}

BTDetails.prototype.isDumpPctLessThanBCIPct = function (bciInstrSessionPct) {
    if(bciInstrSessionPct > 0 && parseInt(this.percentageReqDumpComplete) <= Number(bciInstrSessionPct))
      return true;
    else
      return false;

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
    } else if(cat == 12){
        if (duration < this.minVerySlowDuration) {
            this.minVerySlowDuration = duration;
        }

        if (duration > this.maxVerySlowDuration) {
            this.maxVerySlowDuration = duration;
        }
        this.verySlowDuration += duration;
        this.VerySlowCount = this.VerySlowCount + 1;
    }
    else if(cat == 13)
    {
        if (duration < this.minErrorDuration)
            this.minErrorDuration = duration;

        if (duration > this.maxErrorDuration)
            this.maxErrorDuration = duration;

        this.errorDuration += duration;
        this.errorCount = this.errorCount+1;
    }
    if (duration < this.minDuration) {
        this.minDuration = duration;
    }

    if (duration > this.maxDuration) {
        this.maxDuration = duration;
    }
    //return this;
}

BTDetails.prototype.updateOverAllBTDetail = function (valu) {
    this.BTID = 0;
    this.BTName = 'AllTransactions';

    if (valu.minDuration < this.minDuration) {
        this.minDuration = valu.minDuration;
    }
    if (valu.maxDuration > this.maxDuration) {
        this.maxDuration = valu.maxDuration;
    }
    this.count += valu.count;
    this.duration +=  valu.duration;


    if (valu.minNormalDuration < this.minNormalDuration) {
        this.minNormalDuration = valu.minNormalDuration;
    }
    if (valu.maxNormalDuration > this.maxNormalDuration) {
        this.maxNormalDuration = valu.maxNormalDuration;
    }
    this.NormalCount += valu.NormalCount;
    this.normalDuration += valu.normalDuration;

    if (valu.minSlowDuration < this.minSlowDuration) {
        this.minSlowDuration = valu. minSlowDuration;
    }
    if (valu.maxSlowDuration > this.maxSlowDuration) {
        this.maxSlowDuration = valu.maxSlowDuration;
    }

    this.SlowCount += valu.SlowCount;
    this.slowDuration += valu.slowDuration;

    if (valu.minVerySlowDuration < this.minVerySlowDuration) {
        this.minVerySlowDuration = valu.minVerySlowDuration;
    }
    if (valu.maxVerySlowDuration > this.maxVerySlowDuration) {
        this.maxVerySlowDuration = valu.maxVerySlowDuration;
    }

    this.VerySlowCount += valu.VerySlowCount;
    this.verySlowDuration += valu.verySlowDuration;

    if (valu.minErrorDuration < this.minErrorDuration) {
        this.minErrorDuration = valu.minErrorDuration;
    }
    if (valu.maxErrorDuration > this.maxErrorDuration) {
        this.maxErrorDuration = valu.maxErrorDuration;
    }

    this.errorCount += valu.errorCount;
    this.errorDuration += valu.errorDuration;
    valu.init();
}


module.exports = BTDetails;
