/**
 * Created by Sahil on 10/3/16.
 */


var nt = require('../nodetime');
var proxy = require('../proxy');
var samples = require('../samples');
var methodManager = require('../../../methodManager');

module.exports = function(obj,module){
    var functions = Object.keys(obj);
    var probes = [];
    try {
        for (i in functions) {
            if (typeof obj[functions[i]] == 'function') {
                probes.push(functions[i])
            }
        }

        proxy.around(obj, probes, function (obj, args, local, method)
            {
               try {

                   local.file = module;
                   local.name = method;
                   local.args = args;//{}


                    methodManager.onEntry(local)
                }
                catch(e){console.log(e)}

            }, function (obj, args, ret, local, method) {
                try {
                    methodManager.onExit(local)
                }
                catch(err)
                {console.log(err)}

            }
        )
    }
    catch(e){console.log(e)}

}