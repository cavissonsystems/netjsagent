/**
 * Created by compass341 on 06-Jul-18.
 */

var proxy = require('../proxy');
var AgentSetting = require("../../../agent-setting");
var ut = require('../../../util');

function console(){

}
console.instrumentLoggerObj = function(obj,methods)
{
    try {
        proxy.before(obj, methods, function(obj, args, meth) {
            var context = AgentSetting.getContextObj();
            if(context && context.cavCurrReqFPID && AgentSetting.currentTestRun && AgentSetting.mapForConsoleMeths[meth]) {
                args[args.length - 1] = args[args.length - 1] + " [TOPO:" + AgentSetting.currentTestRun + ":" + AgentSetting.tier + ":" + AgentSetting.server + ":" +
                    AgentSetting.instance + "][FP:" + AgentSetting.currentTestRun + ":" + context.cavCurrReqFPID + ":" +
                    (context.tlFirstTierFPID ? context.tlFirstTierFPID : context.cavCurrReqFPID + "f") + ":" +
                    (context.ndSessionId ? context.ndSessionId : context.cavCurrReqFPID) + ":" + (context.NVSid ? context.NVSid : 0) + ":" +
                    (context.NVPid ? context.NVPid : 0) + "]";
            }

        });
    }
    catch(err){ut.logger.warn(err)}
}

module.exports = console;