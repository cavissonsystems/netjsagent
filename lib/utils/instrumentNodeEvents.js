/**
 * Created by Sahil Dhall on 8/16/17.
 *
 * 1. This feature is use to wrap callback api of all events, that goes fired during execution of node server, so that we can co-relate
 *    btw event and its callback
 * 2. This Feature is default disable, to use this feature we have to pass keyword 'corelateEventCallback=1/0' at ndsettings.conf.
 * 3. Default instrumentation is done at time of agent starting , calling from main file 'netjsagent.js'
 * 4. After verification from QA , we will make this feature default enable by passing a flag 'true' from 'netjsagent.js' and to use
 *    this feature we have to send value from NDC
 *.
 */
var isNative = /\.node$/;
var instrumentAtStart = false;
var global=0;

function wrapHapi(obj, property) {
    var orig = obj[property];
    obj[property] = function () {
        var args = arguments[0]['handler'];
        if (typeof args === 'function')
            arguments[0]['handler'] = wrapHapiHandler(args, property)
        return orig.apply(this, arguments);
    }
}

function wrapHapiHandler(callback, property) {
    var  time = new Date().getTime();
    return function () {
        var args = [].slice.call(arguments);
        if (args.length == 0)
            args[1] = ['Source - HAPI; EventName - ' + property + '.handler; Delay:' + time]            // first argument will always be error, so dding value at last index
        else
            args[args.length] = ['Source - HAPI; EventName - ' + property + '.handler; Delay:' + time]
        try {
            return callback.apply(this, args);
        } catch (e) {
            console.error("Uncaught " + e.stack);
        }finally{}
    }
}

function makeWrappedCallback(callback, sourcePosition, frameLocation, eventName) {
    // add a fake stack frame. we can't get a real one since we aren't inside the original function
    var time = new Date().getTime();
    return function () {
        //if(sourcePosition.indexOf('Express') >-1 || sourcePosition.indexOf('addListener') > -1){time = new Date().getTime();}
        var args = [].slice.call(arguments);
        if (args.length == 0) {
            if (/on|addListener|once/g.test(frameLocation))
                args[1] = ['Source - '+sourcePosition + '; Event - ' + eventName + '; Delay:' + time]
            else
                args[1] = ['Source - '+sourcePosition + '; Delay:' + time]            // first argument will always be error, so dding value at last index
        } else if (/on|addListener|once/g.test(frameLocation))
            args[args.length] = ['Source - '+sourcePosition + '; Event - ' + eventName + '; Delay:' + time]
        else
            args[args.length] = ['Source - '+sourcePosition + '; Delay:' + time]

        try {
            var ret = callback.apply(this, args);
            time = new Date().getTime();
            return ret
        } catch (e) {
            console.error("Uncaught " + e.stack);
        }finally{}
    }
}

function wrapRegistrationFunction(object, property, cav_callbackArg,isExpress) {
    if(!property) return;

    if (typeof object[property] !== "function")
        return;
    var sourcePosition = (isExpress ? 'Express.Router': (object.constructor.name || Object.prototype.toString.call(object))) + "." + property;

    // Capturing original registration function ,Calling unpatch function so that always we can get actual function not wrapped function.
    var fn = object[property];
    if (!fn) return;
    if (fn.unpatch) {
        fn = fn.unpatch()
    }
    // If this feature is enabled then we will set extra argument in callback arguments by finding callback function position
    if (instrumentAtStart || global > 0) {
        object[property] = function () {
            if (property == 'setTimeout' || property == 'setInterval' || property == 'nextTick')cav_callbackArg = 0;
            else if (!cav_callbackArg)cav_callbackArg = arguments.length - 1
            var orig = arguments[cav_callbackArg];
            if (typeof orig === 'function') {
                arguments[cav_callbackArg] = makeWrappedCallback(orig, sourcePosition, property, arguments[0]);
            }

            var cav_args = {}, mm = getMMinstance(); cav_args.args = arguments;

            if (/on|addListener|once/g.test(property))
                cav_args.eventName = arguments[0] ? arguments[0] : undefined
            else if (/setTimeout|setInterval/g.test(property))
                cav_args.eventName = arguments[1] ? arguments[1] : undefined
            cav_args.methodName = 'Global.' + sourcePosition

            // call the original registration function with the modified arguments
            //mm.onEntry(cav_args)
            var ret = fn.apply(this, arguments);
            //mm.onExit(cav_args)
               return ret
        }
    }
    else{
        object[property] = function () {
            return fn.apply(this, arguments);
        }
    }
    //Adding extra property that will always return actual function
    object[property].unpatch = function () {
        object[property] = fn;
        return fn;
    }
    // check that the registration function was indeed overwritten
    if (object[property] === fn)
        console.warn("Agent Couldn't replace ", property, "on", object);

}

function instrumentAllAysncModule(express,EventEmitter,hapi) {

    try {
        wrapRegistrationFunction(this, "setTimeout", 0);
        wrapRegistrationFunction(this, "setInterval", 0);
        wrapRegistrationFunction(process, "nextTick", 0);
        wrapRegistrationFunction(EventEmitter.prototype, "addListener", 1);
        wrapRegistrationFunction(EventEmitter.prototype, "once", 1);
        wrapRegistrationFunction(EventEmitter.prototype, "on", 1);
        if (express) {
            wrapRegistrationFunction(express.Router, 'get', null, true);
            wrapRegistrationFunction(express.Router, 'head', null, true);
            wrapRegistrationFunction(express.Router, 'options', null, true);
            wrapRegistrationFunction(express.Router, 'patch', null, true);
            wrapRegistrationFunction(express.Router, 'put', null, true);
            wrapRegistrationFunction(express.Router, 'post', null, true);
            wrapRegistrationFunction(express.Router, 'delete', null, true);
            wrapRegistrationFunction(express.Router, 'all', null, true);
            wrapRegistrationFunction(express.Router, 'use', null, true);
        }
        if (hapi) {
            //For route we are calling different api , because in hapi .routing is done by 'handler' api
            wrapHapi(hapi.Server.prototype, 'route');
            wrapRegistrationFunction(hapi.Server.prototype, 'ext');
        }
    }
    catch(err){console.log(err)}
}

module.exports = function(isEnable,default_instr) {

    global = isEnable               //Value of keyword use enable/disable this feature
    instrumentAtStart = default_instr               //Defeaul instr is disable , after some time we will make this default enable
    var hapi,express,EventEmitter;;

    //Currently we are instrumenting events registered through EventEmitter, process.nextTick, Timer class, express, hapi

    try {hapi = require('hapi')} catch (e) {hapi = undefined};
    try {express = require('express')} catch (e) {express = undefined};
    EventEmitter = require('events').EventEmitter;
    EventEmitter.prototype.setMaxListeners(0)
    instrumentAllAysncModule(express,EventEmitter,hapi);
    /*if (instrumentAtStart)
        instrumentAllAysncModule(global);
    else {
        checkAndGetModule(require.cache, function (global) {
            instrumentAllAysncModule(global)
        })
    }*/
}
var map={}
function getMMinstance(){
    var instance = map['methodManager']
    if(!instance) {
        instance = require('../methodManager')
        map['methodManager'] = instance
    }
    return instance;
}

function forEach(obj, callback) {
    for (var key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
            continue;
        }
        callback(key);
    }
}

function assign(target, source) {
    forEach(source, function (key) {
        target[key] = source[key];
    });
    return target;
}

function clearCache(requireCache) {
    forEach(requireCache, function (resolvedPath) {
        if (!isNative.test(resolvedPath)) {
            delete requireCache[resolvedPath];
        }
    });
}


function checkAndGetModule(requireCache, cb) {
    var originalCache = assign({}, requireCache);
    clearCache(requireCache);
    var freshModule = cb(global);

    clearCache(requireCache);
    assign(requireCache, originalCache);
}
