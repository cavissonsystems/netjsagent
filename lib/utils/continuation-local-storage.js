'use strict';

var assert      = require('assert');
var wrapEmitter = require('emitter-listener');
var asManagerFile = require('../autoSensor/autoSensorManager');
var asSettingObj = require('../autoSensor/autoSensorSetting');
var agentSetting = require('../agent-setting');
var btManager = require('../BT/btManager');
/*
 *
 * CONSTANTS
 *
 */
var CONTEXTS_SYMBOL = 'cls@contexts';
var ERROR_SYMBOL = 'error@context';

// load polyfill if native support is unavailable
if (!process.addAsyncListener) require('async-listener');

function Namespace(name) {
  this.name   = name;
  // changed in 2.7: no default context
  this.active = null;
  this._set   = [];
  this.id     = null;
}

Namespace.prototype.set = function (key, value) {
  if (!this.active) {
    throw new Error("No context available. ns.run() or ns.bind() must be called first.");
  }

  this.active[key] = value;
  return value;
};

Namespace.prototype.get = function (key) {
  if (!this.active) return undefined;

  return this.active[key];
};

Namespace.prototype.createContext = function () {
  return Object.create(this.active);
};

Namespace.prototype.run = function (fn) {
  var context = this.createContext();
  this.enter(context);
  try {
    fn(context);
    return context;
  }
  catch (exception) {
    if (exception) {
      exception[ERROR_SYMBOL] = context;
    }
    throw exception;
  }
  finally {
    this.exit(context);
  }
};

Namespace.prototype.runAndReturn = function (fn) {
  var value;
  this.run(function (context) {
    value = fn(context);
  });
  return value;
};

Namespace.prototype.bind = function (fn, context) {
  if (!context) {
    if (!this.active) {
      context = Object.create(this.active);
    }
    else {
      context = this.active;
    }
  }

  var self = this;
  return function () {
    self.enter(context);
	if(context['startTime']){
        var duration=(new Date().getTime()-context['startTime']);
        if(context['httpReq'] && !context['httpReq'].cavIncludeFp) {
            if(context['httpReq'].cavBtObj){
                var threshold = context['httpReq'].cavBtObj.threshold.slowThresholds;
                if( new Date().getTime()- context['httpReq'].fpTimeWithoutCavepoch > threshold){
                    context['httpReq'].cavIncludeFp = true;
                    var bt_Data = btManager.getBTData(context['httpReq'].cavBtObj.btId);
                    if(bt_Data){
                        btManager.createAndUpdateBTRecord(context['httpReq'].cavBtObj.btId,context['httpReq'].cavBtObj.btName);
                        bt_Data.updateTotalAndAvgDumpReq();
                    }
                }
            }
        }

        /*if((asSettingObj.threshold > 0) && duration > asSettingObj.threshold) { //comparing duration of event with asThreshold
            process.nextTick(function () {
                var stack = new Error().stack; //capturing current stack not end to end stack
                stack = stack.split("\n"); //Spliting stack because it's comming in single line.
                var flowPathId=context['httpReq'].cavHsFlowPathId;
                if(flowPathId === undefined)
                    flowPathId = '0';
                //calling hotspot method to create 52 and 53 recods.
                asManagerFile.handledHotspotData(stack, duration, (context.startTime - agentSetting.cavEpochDiffInMills),flowPathId,"", process.pid, (new Date().getTime() - agentSetting.cavEpochDiffInMills));
            }, 0)
        }*/
    }
    try {
      return fn.apply(this, arguments);
    }
    catch (exception) {
      if (exception) {
        exception[ERROR_SYMBOL] = context;
      }
      throw exception;
    }
    finally {
      self.exit(context);
    }
  };
};

Namespace.prototype.enter = function (context) {
  assert.ok(context, "context must be provided for entering");

  this._set.push(this.active);
  this.active = context;
};

Namespace.prototype.exit = function (context) {
  assert.ok(context, "context must be provided for exiting");

  // Fast path for most exits that are at the top of the stack
  if (this.active === context) {
    assert.ok(this._set.length, "can't remove top context");
    this.active = this._set.pop();
    return;
  }

  // Fast search in the stack using lastIndexOf
  var index = this._set.lastIndexOf(context);

  assert.ok(index >= 0, "context not currently entered; can't exit");
  assert.ok(index,      "can't remove top context");

  this._set.splice(index, 1);
};

Namespace.prototype.bindEmitter = function (emitter) {
  assert.ok(emitter.on && emitter.addListener && emitter.emit, "can only bind real EEs");

  var namespace  = this;
  var thisSymbol = 'context@' + this.name;

  // Capture the context active at the time the emitter is bound.
  function attach(listener) {
    if (!listener) return;
    if (!listener[CONTEXTS_SYMBOL]) listener[CONTEXTS_SYMBOL] = Object.create(null);

    listener[CONTEXTS_SYMBOL][thisSymbol] = {
      namespace : namespace,
      context   : namespace.active
    };
      if(listener[CONTEXTS_SYMBOL][thisSymbol] && listener[CONTEXTS_SYMBOL][thisSymbol].context)
	   listener[CONTEXTS_SYMBOL][thisSymbol].context['startTime']= new Date().getTime();
  }

  // At emit time, bind the listener within the correct context.
  function bind(unwrapped) {
    if (!(unwrapped && unwrapped[CONTEXTS_SYMBOL])) return unwrapped;

    var wrapped  = unwrapped;
    var contexts = unwrapped[CONTEXTS_SYMBOL];
    Object.keys(contexts).forEach(function (name) {
      var thunk = contexts[name];
      wrapped = thunk.namespace.bind(wrapped, thunk.context);
    });
    return wrapped;
  }

  wrapEmitter(emitter, attach, bind);
};

/**
 * If an error comes out of a namespace, it will have a context attached to it.
 * This function knows how to find it.
 *
 * @param {Error} exception Possibly annotated error.
 */
Namespace.prototype.fromException = function (exception) {
  return exception[ERROR_SYMBOL];
};

function get(name) {
  return process.namespaces[name];
}

function create(name) {
  assert.ok(name, "namespace must be given a name!");

  var namespace = new Namespace(name);
  namespace.id = process.addAsyncListener({
    create : function () {
		          if(namespace.active) {
					namespace.active['startTime']= new Date().getTime();
				}
      return namespace.active;
    },
    before : function (context, storage) { if (storage) {
      namespace.enter(storage);}
    },
    after  : function (context, storage) { if (storage){
      if(storage['startTime']){ //This code used to detect HotSpot events asynchronously, startTime is setting in bind function when call invokes.
        var duration=(new Date().getTime()-storage['startTime']);
        if(storage['httpReq'] && !storage['httpReq'].cavIncludeFp){
          if(storage['httpReq'].cavBtObj){
              var threshold = storage['httpReq'].cavBtObj.threshold.slowThresholds;
              if( new Date().getTime()- storage['httpReq'].fpTimeWithoutCavepoch > threshold){
                  storage['httpReq'].cavIncludeFp = true;
                  var bt_Data = btManager.getBTData(storage['httpReq'].cavBtObj.btId);
                  if(bt_Data){
                      btManager.createAndUpdateBTRecord(storage['httpReq'].cavBtObj.btId,storage['httpReq'].cavBtObj.btName);
                      bt_Data.updateTotalAndAvgDumpReq();
                  }
              }
          }
         }
        /*if((asSettingObj.threshold > 0) && duration > asSettingObj.threshold){ //comparing duration of event with asThreshold
          process.nextTick(function(){

              var stack = new Error().stack; //capturing current stack not end to end stack
              stack = stack.split("\n"); //Spliting stack because it's comming in single line.
              var flowPathId = storage['httpReq'].cavHsFlowPathId;
              var req = storage['httpReq'];  //accessing httpReq object for getting flowpathId.
              if(storage['httpReq'] && storage['httpReq'].cavHsFlowPathId){  //If flowpathid and httpRequest object is not noll than get the fpid.
                  flowPathId=storage['httpReq'].cavHsFlowPathId;
              }
              if(flowPathId === undefined)
                  flowPathId = '0';

              //calling hotspot method to create 52 and 53 recods.
              asManagerFile.handledHotspotData(stack, duration, (storage.startTime - agentSetting.cavEpochDiffInMills),flowPathId,"", process.pid, (new Date().getTime() - agentSetting.cavEpochDiffInMills));

          },0);
        }*/
      }
      namespace.exit(storage);}
    },
    error  : function (storage) { if (storage) namespace.exit(storage); }
  });

  process.namespaces[name] = namespace;
  return namespace;
}

function destroy(name) {
  var namespace = get(name);

  assert.ok(namespace,    "can't delete nonexistent namespace!");
  assert.ok(namespace.id, "don't assign to process.namespaces directly!");

  process.removeAsyncListener(namespace.id);
  process.namespaces[name] = null;
}

function reset() {
  // must unregister async listeners
  if (process.namespaces) {
    Object.keys(process.namespaces).forEach(function (name) {
      destroy(name);
    });
  }
  process.namespaces = Object.create(null);
}
if (!process.namespaces) reset(); // call immediately to set up

module.exports = {
  getNamespace     : get,
  createNamespace  : create,
  destroyNamespace : destroy,
  reset            : reset
};
