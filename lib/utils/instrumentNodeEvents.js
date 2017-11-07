/**
 * Created by Sahil on 8/16/17.
 */
var isNative = /\.node$/;
module.exports = function(global,instrumentAtStart) {
    function wrapRegistrationFunction(object, properties, callbackArg) {
        for (var i in properties) {
            var property = properties[i]
            if (typeof object[property] !== "function")
                return;
            var sourcePosition = (object.constructor.name || Object.prototype.toString.call(object)) + "." + property;
            // capture the original registration function
            var fn = object[property];
            if (!fn) return;
            if (fn.unpatch) {
                fn = fn.unpatch()
            }
            object[property] = function () {
                if (!callbackArg)callbackArg = arguments.length - 1
                var orig = arguments[callbackArg];
                if (typeof orig === 'function') {
                    arguments[callbackArg] = makeWrappedCallback(orig, sourcePosition, property, arguments[0]);
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

    function unwrapRegistrationFunction(object, properties, callbackArg) {
        for (var i in properties) {
            var property = properties[i]
            if (typeof object[property] !== "function")
                return;
            var sourcePosition = (object.constructor.name || Object.prototype.toString.call(object)) + "." + property;
            // capture the original registration function
            var fn = object[property];
            if (!fn) return;
            if (fn.unpatch) {
                fn = fn.unpatch()
            }
            object[property] = function () {
                if (!callbackArg)callbackArg = arguments.length - 1
                var orig = arguments[callbackArg];
                if (typeof orig === 'function') {
                    arguments[callbackArg] = makeUnwrappedCallback(orig, sourcePosition, property, arguments[0]);
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

    function makeUnwrappedCallback(callback, sourcePosition, frameLocation, eventName) {
        // add a fake stack frame. we can't get a real one since we aren't inside the original function
        return function () {
            try {
                return callback.apply(this, args);
            } catch (e) {
                console.error("Uncaught " + e.stack);
            }
        }
    }

    function makeWrappedCallback(callback, sourcePosition, frameLocation, eventName) {
        // add a fake stack frame. we can't get a real one since we aren't inside the original function
        return function () {
            var args = [].slice.call(arguments);
            if (args.length == 0) {
                if (frameLocation == 'on' || frameLocation == 'addListener')
                    args[1] = ['Source - '+sourcePosition + '; EventName - ' + eventName + '; Delay:' + new Date().getTime()]
                else
                    args[1] = ['Source - '+sourcePosition + '; Delay:' + new Date().getTime()]            // first argument will always be error, so dding value at last index
            } else if (frameLocation == 'on' || frameLocation == 'addListener')
                args[args.length] = ['Source - '+sourcePosition + '; EventName - ' + eventName + '; Delay:' + new Date().getTime()]
            else
                args[args.length] = ['Source - '+sourcePosition + '; Delay:' + new Date().getTime()]

            try {
                return callback.apply(this, args);
            } catch (e) {
                console.error("Uncaught " + e.stack);
            }
        }
    }

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
        return function () {
            var args = [].slice.call(arguments);
            if (args.length == 0)
                args[1] = ['Source - HAPI; EventName - ' + property + '.handler; Delay:' + new Date().getTime()]            // first argument will always be error, so dding value at last index
            else
                args[args.length] = ['Source - HAPI; EventName - ' + property + '.handler; Delay:' + new Date().getTime()]
            try {
                return callback.apply(this, args);
            } catch (e) {
                console.error("Uncaught " + e.stack);
            }
        }
    }

    var hapi;
    try {hapi = require('hapi')} catch (e) {hapi = undefined};
    //require('../nodetime/lib/probes/wrapExpress')(express,global)
    instrumentAllAysncModule();
    /*if (instrumentAtStart)
        instrumentAllAysncModule(global);
    else {
        checkAndGetModule(require.cache, function (global) {
            instrumentAllAysncModule(global)
        })
    }*/
    if (hapi) {
        wrapHapi(hapi.Server.prototype, 'route');
        wrapRegistrationFunction(hapi.Server.prototype, ['ext']);
    }


    function instrumentAllAysncModule(global) {
        var express,EventEmitter;
        try {express = require('express')} catch (e) {express = undefined};
        EventEmitter = require('events').EventEmitter;
        EventEmitter.prototype.setMaxListeners(0)
        if (global > 0) {
            //wrapRegistrationFunction(this, ["setTimeout"], 0);
            //wrapRegistrationFunction(this, ["setInterval"], 0);
            wrapRegistrationFunction(EventEmitter.prototype, ["addListener"], 1);
            wrapRegistrationFunction(EventEmitter.prototype, ["on"], 1);
            //wrapRegistrationFunction(process, ["nextTick"], 0);
            if (express) {
                if (express.Router['get'].unpatch) {
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
        else {
            //unwrapRegistrationFunction(this, ["setTimeout"], 0);
            //unwrapRegistrationFunction(this, ["setInterval"], 0);
            unwrapRegistrationFunction(EventEmitter.prototype, ["addListener"], 1);
            unwrapRegistrationFunction(EventEmitter.prototype, ["on"], 1);
            //unwrapRegistrationFunction(process, ["nextTick"], 0);
            if (express) {
                if (express.Router['get'].unpatch) {
                    express.Router['get'] = express.Router['get'].unpatch()
                }
                unwrapRegistrationFunction(express.Router, ['get']);
                unwrapRegistrationFunction(express.Router, ['head']);
                unwrapRegistrationFunction(express.Router, ['options']);
                unwrapRegistrationFunction(express.Router, ['patch']);
                unwrapRegistrationFunction(express.Router, ['put']);
                unwrapRegistrationFunction(express.Router, ['post']);
                unwrapRegistrationFunction(express.Router, ['delete']);
                unwrapRegistrationFunction(express.Router, ['all']);
                unwrapRegistrationFunction(express.Router, ['use']);
            }
        }
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

}
