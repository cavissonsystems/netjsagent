/**
 * Created by sahil on 7/12/16.
 */
var agentSetting = require("./../agent-setting");

function MethodCall(methodId,event,time,seqId,asyncId)
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
    this.isDumped =false;                        //Flag to check entry of this object has been dumped or not, if going to ignore this object but entry is dumped, so need to dump exit also
    this.seqId = seqId;
    this.asyncId = asyncId;
}

MethodCall.prototype.createSeqBlob = function(sb)
{
    //if(agentSetting.excludeMethodOnRespTime > -1) {
    //    if (this.duration < agentSetting.excludeMethodOnRespTime)
    if(this.exclude){
            return;
    }
    sb.add(this.methodId);
    if(!!agentSetting.enableDumpAsyncId && this.asyncId){
        sb.add(':'+process.pid+':'+agentSetting.enableDumpAsyncId+':'+this.asyncId)
    }
    if(this.seqId !== undefined)
        sb.add('_0:'+this.seqId+'_');
    else
        sb.add(this.event);
    sb.add(this.startUpTime);
    sb.add('__');
    this.isDumped =true
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