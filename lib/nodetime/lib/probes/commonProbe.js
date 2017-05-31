/**
 * Created by Sahil on 10/3/16.
 */
var proxy = require('../proxy');
var samples = require('../samples');
var methodManager = require('../../../methodManager'),
    path = require('path'),
    cwd =  process.cwd().substring(process.cwd().lastIndexOf(path.sep)+1,process.cwd().length);

module.exports = function(obj,module){
    var functions = Object.keys(obj);
    var probes = [];
    try {
        for (i in functions) {
            if (typeof obj[functions[i]] == 'function' ) {
                if((module == 'mongodb') && functions[i] =='Server' || functions[i] =='Collection')
                    continue;
                if((module == 'http' )&& functions[i] =='IncomingMessage' || functions[i] =='Agent'|| functions[i] =='_connectionListener'|| functions[i] =='createClient'|| functions[i] =='ServerResponse' || functions[i] =='Client'|| functions[i] =='ClientRequest'|| functions[i] =='Server')
                    continue;
                //if(functions[i] =='Server' || functions[i] =='Collection' || functions[i] =='IncomingMessage' || functions[i] =='Agent'|| functions[i] =='_connectionListener'|| functions[i] =='createClient'|| functions[i] =='ServerResponse' || functions[i] =='Client'|| functions[i] =='ClientRequest'|| functions[i] =='Server')
                //    continue;

                probes.push(functions[i])
            }
        }
        proxy.around(obj, probes, function (obj, args, local, method) {
                local.args = args;//{}
                local.methodName = cwd+'.'+module+'.',method
                methodManager.onEntry(local)
            }, function (obj, args, ret, local, method) {
                    methodManager.onExit(local)
            }
        )
    }
    catch(e){console.log(e)}
}