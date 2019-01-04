var agentSetting = require("./../agent-setting");

function exitMethodCall(methodId,event,startUpTime,endTime,seqId,endSeqId,methodDepth) {

    this.methodId = methodId;
    this.event = event;
    this.startUpTime = startUpTime;
    this.endTime = endTime;
    this.cpuTime;
    this.seqId;
    this.firstmethodid;
    this.firstmethodseqblob;
    this.duration;
    this.exclude = false;
    this.isDumped = false;                        //Flag to check entry of this object has been dumped or not, if going to ignore this object but entry is dumped, so need to dump exit also
    this.seqId = seqId;
    this.startSeqId = seqId;
    this.endSeqId = endSeqId;
    this.methodDepth = methodDepth;
}


exitMethodCall.prototype.createServiceMethodSeqBlob =function(sb){

    sb.add(this.methodId);
    sb.add(this.event);
    sb.add(':');
    sb.add(this.startSeqId);
    sb.add('_');
    sb.add(this.methodDepth);
    sb.add('_');
    sb.add(this.startUpTime);
    if(agentSetting.corelateEventCallback == 0)
        sb.add('_0|');
    else
        sb.add('_1|');

}

exitMethodCall.prototype.createExitOnlySeqBlob = function(sb) {

    sb.add(this.methodId);
    sb.add(this.event)
    sb.add(':')
    sb.add(this.startSeqId)
    sb.add(':')
    sb.add(this.endSeqId)
    sb.add('_')
    sb.add(this.methodDepth);
    sb.add('_')
    sb.add(this.startUpTime);
    if(agentSetting.corelateEventCallback == 0)
        sb.add(':'+this.endTime+'_0_0_0|')
    else
        sb.add(':'+this.endTime+'_0_0_1|')

}

exitMethodCall.prototype.encode = function (sb) {
    var self = this ;

    if(self.event == '_0'){
        self.createServiceMethodSeqBlob(sb);
    }
    else if(self.event == '_1'){
        self.createExitOnlySeqBlob(sb);
    }
};

exports.exitMethodCall = exitMethodCall ;