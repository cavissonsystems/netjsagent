/**
 * Created by Sahil on 8/16/17.
 */

module.exports = function(global){
    function wrapRegistrationFunction(object, properties, callbackArg) {
        for(var i in properties) {
            var property = properties[i]
            if (typeof object[property] !== "function")
                return;
            var sourcePosition = (object.constructor.name || Object.prototype.toString.call(object)) + "." + property;
            // capture the original registration function
            var fn = object[property];
            if(!fn) return;
            if (fn.unpatch) {
                fn = fn.unpatch()
            }
            object[property] = function () {
                if(!callbackArg)callbackArg = arguments.length-1
                var orig = arguments[callbackArg];
                if (typeof orig === 'function') {
                    if(orig.unpatch)
                        orig = orig.unpatch()
                    arguments[callbackArg] = makeWrappedCallback(orig, sourcePosition, property, arguments[0]);
                    arguments[callbackArg].unpatch= function(){
                        arguments[callbackArg] = orig
                        return orig
                    }

                }
                // call the original registration function with the modified arguments
                return fn.apply(this, arguments);
            }
            object[property].unpatch = function () {
                object[property] = fn;
                return fn;
            }
            // check that the registration function was indeed overwritten
            if (object[property] === fn)
                console.warn("Agent Couldn't replace ", property, "on", object);
        }
    }

    function makeWrappedCallback(callback, sourcePosition,frameLocation,eventName) {
        // add a fake stack frame. we can't get a real one since we aren't inside the original function
        return function() {
            var args = [].slice.call(arguments);
            if(args.length ==0) {
                if(frameLocation == 'on' || frameLocation == 'addListener' )
                    args[1] = [sourcePosition+'.'+eventName +';delay:'+ new Date().getTime()]
                else
                    args[1] = [sourcePosition + ';delay:' + new Date().getTime()]            // first argument will always be error, so dding value at last index
            }else if(frameLocation == 'on' || frameLocation == 'addListener' )
                args[args.length] = [sourcePosition+'.'+eventName +';delay:'+ new Date().getTime()]
            else
                args[args.length]=[sourcePosition+';delay:'+ new Date().getTime()]

            try {
                return callback.apply(this, args);
            } catch (e) {
                console.error("Uncaught " + e.stack);
            }
        }
    }
    function wrapHapi(obj,property){
        var orig = obj[property];
        obj[property] = function(){
            var args = arguments[0]['handler'];
            if (typeof args === 'function')
                arguments[0]['handler']=wrapHapiHandler(args,property)
            return orig.apply(this,arguments);
        }
    }
    function wrapHapiHandler(callback,property){
        return function(){
            var args = [].slice.call(arguments);
            if(args.length ==0)
                args[1]='HAPI.'+property+'.handler;delay:'+ new Date().getTime();            // first argument will always be error, so dding value at last index
            else
                args[args.length]='HAPI.'+property+'.handler;delay:'+ new Date().getTime();
            try {
                return callback.apply(this, args);
            } catch (e) {
                console.error("Uncaught " + e.stack);
            }
        }
    }
    var EventEmitter = require('events').EventEmitter,
         express,hapi;
    try{express = require('express')}catch(e){express=undefined};
    try{hapi = require('hapi')}catch(e){hapi=undefined};
    EventEmitter.prototype.setMaxListeners(0)
    if(global>0) {
        wrapRegistrationFunction(this, ["setTimeout"], 0);
        wrapRegistrationFunction(this, ["setInterval"], 0);
        wrapRegistrationFunction(EventEmitter.prototype, ["addListener"], 1);
        wrapRegistrationFunction(EventEmitter.prototype, ["on"], 1);
        wrapRegistrationFunction(process, ["nextTick"], 0);
        if(express) {
            if(express.Router['get'].unpatch){
                express.Router['get'] = express.Router['get'].unpatch()
            }
            wrapRegistrationFunction(express.Router, ['get']);
            wrapRegistrationFunction(express.Router, ['head']);
            wrapRegistrationFunction(express.Router, ['options']);
            wrapRegistrationFunction(express.Router, ['patch']);
            wrapRegistrationFunction(express.Router, ['put']);
            wrapRegistrationFunction(express.Router, ['post']);
            wrapRegistrationFunction(express.Router, ['delete']);
            wrapRegistrationFunction(express.Router, ['all']);
           wrapRegistrationFunction(express.Router, ['use']);
        }
    }
    if(hapi){
        wrapHapi(hapi.Server.prototype, 'route');
        wrapRegistrationFunction(hapi.Server.prototype,['ext']);
    }
}
