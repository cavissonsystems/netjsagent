/**
 * Created by Sahil on 7/7/17.
 */

var agent = require('../agent-setting')

function cavNdSessionDataModel(){
    this.nsSessionFPCount='';
    this.isInstrumentedSession =false
}
cavNdSessionDataModel.NDSessionFPCount =0
cavNdSessionDataModel.exceptionCount= 0;
cavNdSessionDataModel.BTCategory='unknown';
cavNdSessionDataModel.ndSessionId='';
cavNdSessionDataModel.nvSessionId='';
cavNdSessionDataModel.nvPageId='';

cavNdSessionDataModel.encode =  function(ndSessionId,FPStartTime,isInstrumentedSession,testRunID){
    var sb ='';
    return sb = ndSessionId +'-'+ testRunID +'-'+ FPStartTime +'-'+ (isInstrumentedSession ? 1 : 0)
        +'-'+ (cavNdSessionDataModel.BTCategory === "unknown" ? 9 : this.BTCategory) +'-'+ this.exceptionCount +'-'+ cavNdSessionDataModel.NDSessionFPCount +'-'+
        agent.tierID +'-'+ agent.serverID +'-'+ agent.appID;
}

module.exports = cavNdSessionDataModel;