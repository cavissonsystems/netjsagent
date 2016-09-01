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

    this.statusCode ;
    this.category
    this.firstmethodseqblob ;
    this.statusCode ;
    this.category ;
    this.methodStartTime ;
    this.respTime ;
    this.calls = [] ;

}

// generating "2" record
Flowpath.prototype.generate_2_record = function()
{
    return '2,' + this.flowPathId.toString() + "," + this.timeStamp + "," + this.threadID + "," + this.threadSeq + "," + this.id + "," + this.url + "\n" ;
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