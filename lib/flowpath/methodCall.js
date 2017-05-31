/**
 * Created by sahil on 7/12/16.
 */
var agentSetting = require("./../agent-setting");

function MethodCall(methodId,event,time)
{
    this.methodId = methodId;
    this.event = event;
    if(event == '_0_')
        this.startUpTime = time
    else
        this.endTime = time;
    this.cpuTime ;
    this.seqId ;
    this.firstmethodid  ;
    this.firstmethodseqblob  ;
    this.duration;
    this.exclude =false;
}

MethodCall.prototype.createSeqBlob = function(sb)
{
    //if(agentSetting.excludeMethodOnRespTime > -1) {
    //    if (this.duration < agentSetting.excludeMethodOnRespTime)
    if(this.exclude){
            return;
    }
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