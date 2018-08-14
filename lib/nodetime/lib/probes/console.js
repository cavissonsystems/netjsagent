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
        if(methods)
            methods=methods.split(",");
        proxy.before(obj, methods, function(obj, args, ret) {
            var context = AgentSetting.getContextObj();
            if(context && context.cavFlowPathId && AgentSetting.currentTestRun )
                args[args.length -1]=args[args.length -1]+" [TOPO:"+AgentSetting.currentTestRun+":"+AgentSetting.tier+":"+AgentSetting.server+":"+
                    AgentSetting.instance+"][FP:"+ AgentSetting.currentTestRun+":"+context.cavFlowPathId+":"+
                    (context.tlFirstTierFPID?context.tlFirstTierFPID:(context.cavFlowPathId+'f'))+":"+
                    (context.ndSessionId?context.ndSessionId:context.cavFlowPathId)+":"+(context.NVSid?context.NVSid:0)+":"+
                    (context.NVPid?context.NVPid:0)+"]";

        });
    }
    catch(err){ut.logger.warn(err)}
}

module.exports = console;