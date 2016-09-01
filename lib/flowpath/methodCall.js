/**
 * Created by sahil on 7/12/16.
 */

function MethodCall()
{
    this.methodId ;
    this.firstmethodid  ;
    this.firstmethodseqblob  ;
    this.startUpTime ;

    this.endTime ;
    this.cpuTime ;
    this.seqId ;
    this.event ;
}

MethodCall.prototype.createSeqBlob = function(sb)
{
    sb.add(this.methodId);
    sb.add(this.event);
    sb.add(this.startUpTime);
    sb.add('__');

}

MethodCall.prototype.createEndSeqBlob = function(sb)
{
    sb.add(this.methodId);
    sb.add(this.event);
    sb.add(this.endTime);
    sb.add('_1___');

}

MethodCall.prototype.encode= function (sb) {
    var self = this ;
    if(this.event == '_0_') {
        this.createSeqBlob(sb);
    }
    else {
        this.createEndSeqBlob(sb);
    }
};


exports.MethodCall= MethodCall ;