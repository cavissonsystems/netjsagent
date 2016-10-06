/*
 * Copyright (c) 2012 Dmitri Melikyan
 *
 * Permission is hereby granted, free of charge, to any person obtaining a 
 * copy of this software and associated documentation files (the 
 * "Software"), to deal in the Software without restriction, including 
 * without limitation the rights to use, copy, modify, merge, publish, 
 * distribute, sublicense, and/or sell copies of the Software, and to permit 
 * persons to whom the Software is furnished to do so, subject to the 
 * following conditions:
 * 
 * The above copyright notice and this permission notice shall be included 
 * in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN 
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR 
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR 
 * THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

EventEmitter = require('events').EventEmitter;
var createNamespace = require('continuation-local-storage').createNamespace,
    cavNamespace = createNamespace('cavissonNamespace');

var nt;

exports.init = function() {
  nt = global.nodetime;
}

var Locals = function() {
  this.time = undefined;
  this.stackTrace = undefined;
  this.params = undefined;
}


exports.before = function(obj, meths, hook) {
  if(!Array.isArray(meths)) meths = [meths];

  meths.forEach(function(meth) {
    var orig = obj[meth];
    if(!orig) return;

    obj[meth] = function() {
      try { hook(this, arguments); } catch(e) { nt.error(e); }
      return orig.apply(this, arguments);
    };
  });
};


exports.after = function(obj, meths, hook) {
  if(!Array.isArray(meths)) meths = [meths];

  meths.forEach(function(meths) {
    var orig = obj[meths];
    if(!orig) return;

    obj[meths] = function() {
      var ret = orig.apply(this, arguments);
      try { hook(this, arguments, ret); } catch(e) { nt.error(e) }
      return ret;
    };
  });
};


exports.around = function(obj, meths, hookBefore, hookAfter) {
  if(!Array.isArray(meths)) meths = [meths];

  meths.forEach(function(meth) {
    var orig = obj[meth];
    if(!orig) return;

    obj[meth] = function() {
      var locals = new Locals();
      try { hookBefore(this, arguments, locals,meth); } catch(e) { nt.error(e) }
      var ret = orig.apply(this, arguments);
      try { hookAfter(this, arguments, ret, locals,meth); } catch(e) { nt.error(e) }
      return ret;
    };
  });
};


exports.callback = function(args, pos, hookBefore, hookAfter) {
  if(args.length <= pos) return false;
  if(pos === -1) pos = args.length - 1;

  var orig = (typeof args[pos] === 'function') ? args[pos] : undefined;
  if(!orig) return;

  args[pos] = function() {

    if(hookBefore) try { hookBefore(this, arguments); } catch(e) { nt.error(e); }
    var ret = orig.apply(this, arguments);
    if(hookAfter) try { hookAfter(this, arguments); } catch(e) { nt.error(e); }
    return ret;
  };

  orig.__proxy__ = args[pos];
};

/*
 Cavisson code for Setting req & res in cavNamespace ("continuation-local-storage") for all method (from first method to last)
 first method will contain the flowpathid for complete chain of all method in a particular request.
 */

exports.callback4flowpath = function(args, pos, hookBefore, hookAfter) {
  if(args.length <= pos) return false;
  if(pos === -1) pos = args.length - 1;

  var orig = (typeof args[pos] === 'function') ? args[pos] : undefined;
  if(!orig) return;

  args[pos] = function() {

    if(hookBefore) try { hookBefore(this, arguments); } catch(e) { nt.error(e); }
    // run following middleware in the scope of the cavNamespace we created
    var ret;
    var passedArgs=arguments;

      cavNamespace.bindEmitter(passedArgs[0]);
      cavNamespace.bindEmitter(passedArgs[1]);

      cavNamespace.run(function() {

          cavNamespace.set('httpReq',passedArgs[0]);
          cavNamespace.set('httpRes',passedArgs[1]);

      ret = orig.apply(this, passedArgs);
    });
    //var ret = orig.apply(this, arguments);
    if(hookAfter) try { hookAfter(this, arguments); } catch(e) { nt.error(e); }
    return ret;
  };

  orig.__proxy__ = args[pos];
};


exports.getter = function(obj, props, hook) {
  if(!Array.isArray(props)) props = [props];

  props.forEach(function(prop) {
    var orig = obj.__lookupGetter__(prop);
    if(!orig) return;

    obj.__defineGetter__(prop, function() {
      var ret = orig.apply(this, arguments);
      try { hook(this, ret); } catch(e) { nt.error(e) }
      return ret;
    });
  });
};



if(!EventEmitter.prototype.__patched__) {
  /* make sure a wrapped listener can be removed */
  exports.before(EventEmitter.prototype, 'removeListener', function(obj, args) {
    if(args.length > 1 && args[1] && args[1].__proxy__) {
      args[1] = args[1].__proxy__;
    }
  });

  EventEmitter.prototype.__patched__ = true;
}


