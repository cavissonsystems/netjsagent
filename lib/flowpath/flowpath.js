/**
 * Created by Sahil on 7/12/16.
 */

var util = require('./../util');
var StringBuffer = require('./StringBuffer').StringBuffer;

function Flowpath (flowpath)
{
    this.flowPathId  ;
    this.timeInMillis  ;             //FP starting time
    this.timeStamp  ;
    this.threadID  ;
    this.threadSeq ;
    this.seqPfx  ;
    this.tlFirstTierFPID ;
    this.btName ;
    this.id;
    this.url ;
    this.fpTimeWithoutCavepoch;
    this.flowpathHdrDump = false;
    this.fp3RecordDump = false;
    this.statusCode ;
    this.category
    this.firstmethodseqblob ;
    this.statusCode ;
    this.category ;
    this.methodStartTime ;
    this.respTime ;
    this.calls = [] ;
    this.nonServiceMethodDepth=0;           //total counts of all methods invoked in flowpath
    this.correlationIDHeader='';            //correlation id header
    this.isNonServiceMethodDepthExceeds = false;
    this.cavNVCookie='';
    this.NVSid = '';
    this.NVPid = '';
    this.ndSessionId='';
    this.dumpForcefullL1FP = false;
    this.eventArray = [];
    this.cavCurrReqFPID;
}

Flowpath.prototype.dumpMethodArgs = function() {
    if(this.eventArray.length){
        var sb = new StringBuffer();
        sb.add('19,'+ this.flowPathId +',')
        for(var i in this.eventArray){
            this.eventArray[i].encode(sb);
            if(this.eventArray.length - 1 != i)
                sb.add('|')
        }
        this.eventArray.length =0;
        return sb.toString() + '\n';
    }
}
// generating "2" record
Flowpath.prototype.generate_2_record = function() {
    return '2,' + this.flowPathId.toString() + "," + this.timeStamp + "," + this.threadID + "," + this.threadSeq + "," + this.id + "," + this.url + ","+(this.correlationIDHeader ? this.correlationIDHeader +",": ",") + ("" === (this.ndSessionId) ? 0 : this.ndSessionId) +  "," +
        (undefined === (this.NVSid) ? 0 : this.NVSid) + ","+ (undefined === (this.NVPid) ? 0 : this.NVPid) + "\n" ;
}

// generating "3" record
Flowpath.prototype.generate_3_record = function(){

    var sb = new StringBuffer();
    try {

        if (this.calls != null) {

            if (this.flowPathId.indexOf(":") != -1)                   //Spliting flowpathid, so only current FPID will be sent not parent ID
            {
                this.flowPathId = this.flowPathId.split(':')[0];
            }
            var record = '3,' + this.flowPathId + ',' ;

            sb.add(record);

            for (var call in this.calls) {
                if(this.calls[call] !== undefined)
                    this.calls[call].encode(sb);
            }

            this.calls = [];
            return sb.toString() + "\n";

        }
    }
    catch(err){util.logger.warn("Error in generating 3 record : ",err);}
}

// generating "4" record
Flowpath.prototype.generate_4_record = function ()
{
    var sb = new StringBuffer();
    try {

        if (this.calls != null) {

            if (this.flowPathId.indexOf(":") != -1)                   //Spliting flowpathid, so only current FPID will be sent not parent ID
            {
                this.flowPathId = this.flowPathId.split(':')[0];
            }
            var record = '4,' + this.flowPathId + ',' + this.statusCode + ',' + this.category + ',-,' + this.respTime + ',';

            sb.add(record);

            for (var call in this.calls) {
                 this.calls[call].encode(sb);
            }

            //This check is for appending the first method at last of seqBlob , so if first method id is null can,t attach any seqblob
            /*if (this.firstmethodid) {
                record = record + this.firstmethodseqblob
            }*/

            return sb.toString() + "\n";

        }
    }
    catch(err){util.logger.warn(err)}
}


exports.Flowpath = Flowpath ;
