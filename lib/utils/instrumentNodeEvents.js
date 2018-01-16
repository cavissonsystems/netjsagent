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
var captureDelay=0,instrumentAsyncFunc=false;
var agent = require('../agent-setting'),
    mm = require('../methodManager');

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
function makeWrappedCallback(callback, sourcePosition, frameLocation, eventName,parentId,callbackPostion) {
    // add a fake stack frame. we can't get a real one since we aren't inside the original function
    var time = new Date().getTime();
    return function () {
        if(time ==0)time=new Date().getTime();
        try {
            if(callbackPostion == 0)
                global.cavisson_event_callback_releation_data = 'Source - ' + sourcePosition + (parentId ? '; parentId - ' + parentId : '') + '; Delay:' + time
            else
                global.cavisson_event_callback_releation_data = 'Source - ' + sourcePosition + '; Event - ' + eventName + (parentId ? '; parentId - ' + parentId : '') + '; Delay:' + time
            var ret = callback.apply(this, arguments);
            global.cavisson_event_callback_releation_data=undefined;
            time = 0
            return ret

        } catch (e) {
            //console.error("Uncaught " + e.stack);
            global.cavisson_event_callback_releation_data=undefined;
        }
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
    if (captureDelay > 0) {
        object[property] = function () {
            var isInstrumentTx = agent.isInstrumentTx()
            if(isInstrumentTx) {
                if (property == 'setTimeout' || property == 'setInterval' || property == 'nextTick')cav_callbackArg = 0;
                else if (!cav_callbackArg)cav_callbackArg = arguments.length - 1
                var orig = arguments[cav_callbackArg];

                if (instrumentAsyncFunc) {
                    var cav_args = {};
                    cav_args.args = arguments;

                    if (cav_callbackArg == 0)                   //If callback is at 0th position then event will be on first position else event will be on 0th position
                        cav_args.eventName = arguments[1] ? arguments[1] : undefined
                    else
                        cav_args.eventName = arguments[0] ? arguments[0] : undefined

                    cav_args.methodName = 'Global.' + sourcePosition
                    mm.onEntry(cav_args)            // call the original registration function with the modified arguments
                }
                if (typeof orig === 'function') {
                    if (arguments[0] != 'close' && arguments[0] != 'error')
                        arguments[cav_callbackArg] = makeWrappedCallback(orig, sourcePosition, property, arguments[0],(cav_args? cav_args.parentId : undefined),cav_callbackArg);
                }
            }
            var ret = fn.apply(this, arguments);
            isInstrumentTx && instrumentAsyncFunc && (mm.onExit(cav_args) , delete cav_args)
            return ret
        }
    }
    //Adding extra property that will always return actual function
    object[property].unpatch = function () {
        object[property] = fn;
        return fn;
    }
    // check that the registration function was indeed overwritten
    if (object[property] === fn){
       // console.warn("Agent Couldn't replace ", property, "on", object);
    }
}

function instrumentAllAysncModule(express,EventEmitter,hapi) {

    try {
        wrapRegistrationFunction(this, "setTimeout", 0);
        wrapRegistrationFunction(this, "setInterval", 0);
        //wrapRegistrationFunction(process, "nextTick", 0);
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

module.exports = function(isEnable,instrAsyncFunc) {
    captureDelay=0,instrumentAsyncFunc=false

    instrumentAsyncFunc = instrAsyncFunc
    captureDelay = isEnable               //Value of keyword use enable/disable this feature
    var hapi,express,EventEmitter;;

    //Currently we are instrumenting events registered through EventEmitter, process.nextTick, Timer class, express, hapi

    //try {hapi = require('hapi')} catch (e) {hapi = undefined};
    try {express = require('express')} catch (e) {express = undefined};
    EventEmitter = require('events').EventEmitter;
    EventEmitter.prototype.setMaxListeners(0)
    instrumentAllAysncModule(express,EventEmitter,hapi);
}
