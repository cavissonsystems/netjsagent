/**
 * Created by Sahil on 10/3/16.
 */
var proxy = require('../proxy');
var samples = require('../samples');
var methodManager = require('../../../methodManager'),
    path = require('path'),
    cwd =  process.cwd().substring(process.cwd().lastIndexOf(path.sep)+1,process.cwd().length);

var agentSetting = require('../../../agent-setting')

module.exports = function(obj,module){
    var functions = Object.keys(obj);
    var probes = [];
    try {
        for (i in functions) {
            if (typeof obj[functions[i]] == 'function' ) {
                if((module == 'mongodb') && functions[i] =='Server' || functions[i] =='Collection'  || functions[i] == 'MongoClient')
                    continue;
                if((module == 'http' )&& functions[i] =='IncomingMessage' || functions[i] =='Agent'|| functions[i] =='_connectionListener'|| functions[i] =='createClient'|| functions[i] =='ServerResponse' || functions[i] =='Client'|| functions[i] =='ClientRequest'|| functions[i] =='Server' || functions[i] == 'OutgoingMessage')
                    continue;
                //if(functions[i] =='Server' || functions[i] =='Collection' || functions[i] =='IncomingMessage' || functions[i] =='Agent'|| functions[i] =='_connectionListener'|| functions[i] =='createClient'|| functions[i] =='ServerResponse' || functions[i] =='Client'|| functions[i] =='ClientRequest'|| functions[i] =='Server')
                //    continue;

                probes.push(functions[i])
            }
        }
        proxy.around(obj, probes, function (obj, args, local, method) {
                var parentId;
                local.args = args;//{}
                local.methodName = cwd+'.'+module+'.'+method
                //for async callback
                proxy.callback(args ,-1,
                    function(obj,args,callbackLocal){

                        callbackLocal.args = args;
                        callbackLocal.methodName = cwd+'.'+module+'._http_OneTime_ResponseHandler';
                        //extract the name or property name of callback Function
                        if(typeof obj == 'object'){
                            var keys = Object.keys(obj)
                            //console.log('Keys',keys)
                        }
                        if(typeof obj[keys[keys.length -1]] == 'function'){
                            methodname =  obj[keys[keys.length -1]].name
                            if(methodname.length == 0 && methodname != undefined)
                                callbackLocal.methodName = cwd+'.'+module+'.'+keys[keys.length -1]
                            else
                                callbackLocal.methodName = cwd+'.'+module+'.'+methodname
                        }

                        if(!!parentId && !!agentSetting.enableDumpAsyncId )
                            global.cavisson_correlation_asyncId = parentId
                        methodManager.onEntry(callbackLocal)
                        global.cavisson_correlation_asyncId = undefined;
                    },
                    function(obj,args,callbackLocal){
                        methodManager.onExit(callbackLocal)
                    })

                try{
                    var context = agentSetting.getContextObj()
                    if(!!context && !!agentSetting.enableDumpAsyncId)
                        global.cavisson_correlation_asyncId = parentId = context.seqId;
                    methodManager.onEntry(local)
                    global.cavisson_correlation_asyncId = undefined;
                }catch(e){
                    global.cavisson_correlation_asyncId = undefined;
                    util.logger.error(agentSetting.currentTestRun,' | Error in comman Probes AsyncCallback Wrap',e)
                }
            }, function (obj, args, ret, local, method) {
                methodManager.onExit(local)
            }
        )
    }
    catch(e){console.log(e)}
}
