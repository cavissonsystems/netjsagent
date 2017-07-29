/*
* Created by Sahil on 20/7/17.
* */

var proxy = require('./proxy'),
    methodManager = require('../../methodManager'),
    path = require('path');

module.exports=function(module) {
    var moduleName, instrument = false;
    moduleName = module[0], instrument = module[1]

    var keys = Object.keys(require.cache), matched = undefined;
    for (var i in keys) {
        if (keys[i] === moduleName) {
            matched = true;
            break;
        }
    }
    if (matched) {
        var moduleObject = require(moduleName)
        instrumentMethods(moduleName, moduleObject, moduleObject.prototype, instrument);
    }
}

function instrumentMethods(moduleName, target,protoObject,instrument) {
    for (var name in target ) {
        if(target[name].unpatch){
            target[name] = target[name].unpatch()
        }
        if (!target.__lookupGetter__(name) && typeof(target[name]) == "function" ) {
            if (!target[name].__super__ &&
                (target[name].prototype ||
                (target[name].prototype && Object.keys(target[name].prototype).length == 0))
                && Object.keys(target[name]).length == 0) {
                traceMethod(moduleName, target,name,instrument);
            }
        }
    }
    for(var name in protoObject){
        if(typeof(protoObject[name]) == "function" ) {
            if(protoObject[name].unpatch){
                protoObject[name] = protoObject[name].unpatch()
            }
            traceMethod(moduleName, protoObject, name, instrument);
        }
    }
}

function traceMethod( moduleName, target, name ,instrument) {
    var method = target[name];
    if( method && !method.__ddInstrumented__ ) {
        var moduleDir = path.dirname(moduleName)
        var module = path.basename(moduleName, '.js')
        proxy.traceAround(target, name, function (obj, args, local, method) {
            local.args = args;//{}
            local.methodName = moduleDir + '.' + module + '.' + method
            methodManager.onEntry(local)
        }, function (obj, args, ret, local, method) {
            methodManager.onExit(local)
        },instrument)
        /*var p = target[name].prototype;
        for (var item in p) {
            if ((typeof(p[item]) == "function") &&
                (Object.keys(p[item]).length == 0) &&
                (Object.keys(p[item].prototype).length == 0)) {
                var itemName = fullName + "." + item;
            }
        }*/
    }
}