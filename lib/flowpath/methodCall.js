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

    sb.clear();

    sb.add(this.methodId);
    sb.add(this.event);
    sb.add(this.startUpTime);
    sb.add('__');

    return sb;

}

MethodCall.prototype.createEndSeqBlob = function(sb)
{
    sb.clear();

    sb.add(this.methodId);
    sb.add(this.event);
    sb.add(this.endTime);
    sb.add('_1___');

    return sb;

}

MethodCall.prototype.encode= function (sb) {
    var self = this ;
    if(this.event == '_0_') {
        var data = this.createSeqBlob(sb);
        return data.toString()
    }
    else {
        var data = this.createEndSeqBlob(sb);
        return data.toString();
    }
};


exports.MethodCall= MethodCall ;