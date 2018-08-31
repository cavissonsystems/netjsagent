/**
 * Created by compass341 on 10-Jul-18.
 */

var proxy = require('../proxy');
var AgentSetting = require("../../../agent-setting");
var ut = require('../../../util');

function winston(){
}

function appendTOPOToLogs(args, meth){
    try {
        var context = AgentSetting.getContextObj();
        if (context && context.cavFlowPathId && AgentSetting.currentTestRun && AgentSetting.mapForWinstonLogMeths[meth]) {
            args[args.length - 1] = args[args.length - 1] + " [TOPO:" + AgentSetting.currentTestRun + ":" + AgentSetting.tier + ":" + AgentSetting.server + ":" +
                AgentSetting.instance + "][FP:" + AgentSetting.currentTestRun + ":" + context.cavFlowPathId + ":" +
                (context.tlFirstTierFPID ? context.tlFirstTierFPID : (context.cavFlowPathId + 'f')) + ":" +
                (context.ndSessionId ? context.ndSessionId : context.cavFlowPathId) + ":" + (context.NVSid ? context.NVSid : 0) + ":" +
                (context.NVPid ? context.NVPid : 0) + "]";
        }
    } catch(err){ut.logger.warn(" Error occur in instrumenting winston api, fn is appendTOPOToLogs ",err)}
}
function instrumentLoggerObj(obj) {
    try {
        proxy.before(obj, ['error','warn','info','debug','log'], function(obj, args, meth) {
            appendTOPOToLogs(args,args[0]);
        });
    } catch(err){ut.logger.warn(" Error occur in instrumenting winston api, fn is instrumentLoggerObj ",err)}
};
function instrumentCreateLoggerObj(obj) {
    try {
        proxy.before(obj, ['error','warn','info','debug','log'], function(obj, args, meth) {
            appendTOPOToLogs(args,meth);
        });
    } catch(err){ut.logger.warn(" Error occur in instrumenting winston api, fn is instrumentCreateLoggerObj ",err)}
};
module.exports = function(obj){
    try{
        proxy.after(obj, 'createLogger', function (obj, args, ret) {
            instrumentCreateLoggerObj(ret);
        });
        if(obj) {
            if(obj.Logger.prototype) {
                instrumentLoggerObj(obj.Logger.prototype);
            }else
                instrumentLoggerObj(obj);
        }
    }catch(e){
        ut.logger.warn(" Error occur in instrumenting winston api ",e);
    }
}


