/**
 * Created by sahil on 7/12/16.
 */
var agentSetting = require("./../agent-setting");

function eventData(methodId,seqId,headerId,argsName) {
    this.methodId = methodId
    this.seqId = seqId
    this.headerId = headerId
    this.argsName = argsName
}

eventData.prototype.encode= function (sb) {
    sb.add('1')            //1 is used to know this is for method args
    sb.add(':'+this.methodId)
    sb.add(':'+this.seqId)
    sb.add(':'+this.headerId)
    sb.add(':'+1)
    sb.add(':<'+this.argsName+'>')

    return sb;
};


exports.eventData= eventData ;
