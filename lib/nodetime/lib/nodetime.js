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


if(global.nodetime) return global.nodetime;
var agentSetting= require("../../agent-setting");
var cavUtils = require('../../util');
var fs = require('fs');
var os = require('os');
var util = require('util');
var path = require('path');
var events = require('events');
var cluster = require('cluster');
var crypto = require('crypto');
var agentio = require('agent.io');
var proxy = require('./proxy');
var samples = require('./samples');
var metrics = require('./metrics');
var info = require('./info');
var sender = require('./sender');
var stdout = require('./stdout');
var dtrace = require('./dtrace');
var filter = require('./filter');
var PredicateFilter = filter.PredicateFilter;
var v8profiler = require('./v8-profiler');
var instPrfParseobj = require('../../instrProfileParser');


var Nodetime = function() {
  this.initialized = false;
  this.version = '0.2.12';
  this.master = cluster.isMaster;
  this.paused = true;
  this.pauseAt = undefined;
  this.nextId = Math.round(Math.random() * Math.pow(10, 6));
  this.filterFunc = undefined;
  this.times = {};
  this.timekit = undefined;

  events.EventEmitter.call(this);
};

util.inherits(Nodetime, events.EventEmitter);
exports = module.exports = global.nodetime = new Nodetime(); 


Nodetime.prototype.profile = function(opt) {
  if(this.initialized) return;
  this.initialized = true;

  var self = this;

  if(!opt) opt = {};

  // registered accounts
  this.accountKey = opt.accountKey;
  this.appName = opt.appName || 'Default Application'; 
  if(this.accountKey) {
    this.sessionId = 'pro:' + this.accountKey + ':' + sha1(this.appName);
  }

  this.headless = opt.headless;
  this.dtrace = opt.dtrace;
  this.stdout = opt.stdout;
  if(this.stdout && typeof opt.headless === 'undefined') this.headless = true;
  this.debug = opt.debug;
  this.server = opt.server || "https://nodetime.com";


  // try to load timekit
  try {
    this.timekit = require('timekit');
    if(!this.timekit.time() || !this.timekit.cputime()) throw new Error('timekit broken');
  } 
  catch(err) { 
    this.timekit = undefined;
    //this.error(err);
  }


  // node >= 0.8
  this.hasHrtime = process.hasOwnProperty('hrtime');

  // prepare probes
  var probes = {};
  var files = fs.readdirSync(path.dirname(require.resolve('./nodetime')) + '/probes');
  files.forEach(function(file) {
    var m = file.match('^(.*)+\.js$');
    if(m && m.length == 2) probes[m[1]] = true;
  });

  proxy.after(module.__proto__, 'require', function(obj, args, ret) {
    if(!ret) return;
    if(ret.__required__) return;

    var builtin = true;

    if(!args[0].match(/^[^\/\\]+$/)) {
      builtin = false;
    }

    if(!builtin) {
      (fs.hasOwnProperty('exists') ? fs : path).exists(args[0] + '.probe', function(exists) {
        if(exists) {
          ret.__required__ = true; 
          require(args[0] + '.probe')(ret);
        }
      });
    }
    else if(probes[args[0]]) {
      ret.__required__ = true;
      require('./probes/' + args[0])(ret);
    }
    else if(instPrfParseobj.findModuleInInstrProfile(args[0]))
    {
        try {
            ret.__required__ = true;
            require('./probes/commonProbe')(ret, args[0]);
        } catch (e) {
            cavUtils.logger.warn(e)
        }
    }
  });
  //metrics.init();
  proxy.init();
  //if(this.stdout) stdout.init();
  //if(this.dtrace) dtrace.init();
  if(!this.headless) sender.init();
  //filter.init();
  samples.init();
  //info.init();
  //v8profiler.init();

  // expose tools for non-builtin modules
  this.dev = {
    proxy: proxy,
    samples: samples,
    info: info
  };


  // always activate profiler at startup and pause if not resumed for 3 minutes
  //this.resume(300);
  /*setInterval(function() {
    if(!self.paused && self.millis() > self.pauseAt) 
      self.pause(); 
  }, 1000);*/
};


Nodetime.prototype.pause = function() {
  if(!this.initialized) return;

  this.paused = true;
  this.pauseAt = undefined;
 
  this.filterFunc = undefined;

  //this.message('profiler paused');
};


Nodetime.prototype.resume = function(seconds) {
  if(!this.initialized) return;

  if(!seconds) seconds = 180;

  this.pauseAt = this.millis() + seconds * 1000;
  this.paused = false;

  //this.message('profiler resumed for ' + seconds + ' seconds');
};


Nodetime.prototype.filter = function(func) {
  this.filterFunc = func;
};


Nodetime.prototype.time = function(label, context) {
  if(this.paused || !this.initialized) return;

  this.times[label] = {
    time: samples.time("Custom", label, true),
    stackTrace: samples.stackTrace(),
    context: context
  };
};


Nodetime.prototype.timeEnd = function(label, context) {
  if(this.paused || !this.initialized) return;

  var time = this.times[label];
  delete this.times[label];
  if(!time) throw new Error('No such label: ' + label);

  if(!time.time.done()) return;

  var obj = {'Type': 'Custom'};
  
  // merge start context
  if(time.context) {
    for(var prop in time.context) {
      obj[prop] = time.context[prop];
    }
  }

  // merge end context
  if(context) {
    for(var prop in context) {
      obj[prop] = context[prop];
    }
  }

  // add stack trace
  obj['Stack trace'] = time.stackTrace;

  samples.add(time.time, obj, 'Custom: ' + label);
};


Nodetime.prototype.metric = function(scope, name, value, unit, op, persist) {
  if(!this.initialized) return;

  metrics.add(scope, name, value, unit, op, persist);
};


Nodetime.prototype.hrtime = function() {
  if(this.timekit) {
    return this.timekit.time();
  }
  else if(this.hasHrtime) {
    var ht = process.hrtime();
    return ht[0] * 1000000 + Math.round(ht[1] / 1000);
  }
  else {
    return new Date().getTime() * 1000;
  }
};


Nodetime.prototype.micros = function() {
  return this.timekit ? this.timekit.time() : new Date().getTime() * 1000;
};


Nodetime.prototype.millis = function() {
  return this.timekit ? this.timekit.time() / 1000 : new Date().getTime();
};


Nodetime.prototype.cputime = function() {
  return this.timekit ? this.timekit.cputime() : undefined;
};


Nodetime.prototype.log = function(msg) {
  //if(this.debug && msg) //console.log('nodetime:', msg);
    cavUtils.logger.info(agentSetting.currentTestRun," | ",msg)
};


Nodetime.prototype.error = function(e) {
  //if(this.debug && e) //console.error('nodetime error:', e, e.stack);
  cavUtils.logger.warn('probe error:', e, e.stack);
};


Nodetime.prototype.dump = function(obj) {
  //if(this.debug) //console.log(util.inspect(obj, false, 10, true));
  cavUtils.logger.warn('probe error:', obj);
};


Nodetime.prototype.message = function(msg) {
  //util.log("\033[1;31mNodetime:\033[0m " + msg);
    cavUtils.logger.warn('probe error:', msg);
};


var isValidCommand = function(obj) { 
  if(!obj) return false;
  if(typeof obj.cmd !== 'string' || obj.cmd.length > 256) return false;

  return true;
};


var sha1 = function(str) {
  var hash = crypto.createHash('sha1');
  hash.update(str);
  return hash.digest('hex');
};
