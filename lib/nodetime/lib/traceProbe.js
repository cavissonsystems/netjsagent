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
    try{
        /*
        All First-Object Functions are Itterated over the Modules.
        */
        //Iterate over the modules Object properties name.
        for (var name in target ) {
            //only properties which belong to the Module Object.
            if(target.hasOwnProperty(name)){
                //Escaping the getter and setter methods.
                if (!target.__lookupGetter__(name) && !target.__lookupSetter__(name)) {
                    //for functions
                    if(typeof(target[name]) == 'function') {
                        //Escaping the super Reference and prototype Reference.
                        if (!target[name].__super__ &&
                            (target[name].prototype ||
                                (target[name].prototype && Object.keys(target[name].prototype).length == 0))
                            && Object.keys(target[name]).length == 0) {

                            proxy.unInstrument(target[name]);
                            if(instrument)
                                traceMethod(moduleName, target, name, instrument);
                        }
                    }
                }
            }

        }
        //Iteraing for the Prototype Object
        for(var name in protoObject){
            //The properties belong to the Prototype Object
            if(protoObject.hasOwnProperty(name)) {
                //Escaping the getter and setter
                if(!protoObject.__lookupGetter__(name) && !protoObject.__lookupSetter__(name)){
                    //Only Functions
                    if(typeof(protoObject[name]) == 'function'){

                        proxy.unInstrument(protoObject[name]);
                        if(instrument)
                            traceMethod(moduleName, protoObject, name, instrument);

                    }
                }
            }
        }

    }catch(e){
        util.logger.error(' Error in instrumentMethods : ',e)
    }
}

function traceMethod( moduleName, target, name ,instrument) {
    try{
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
    }catch(e){
        util.logger.error(' Error in instrumentMethods : ',e)
    }
}
