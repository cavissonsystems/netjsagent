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


var proxy = require('../proxy');
var samples = require('../samples');
var backenRecord = require ('../../../backend/backendRecord.js');
var tierCall = require("../../../flowpath/tierCall").tierCall;
var ut = require('../../../util');
var AgentSetting = require("../../../agent-setting");
var ndMetaData = require('../../../metaData/ndMethodMetaData');
var ndSQLMetaData = require('../../../metaData/ndSQLMetaData');

var commands = [
  'get',
  'gets',
  'getMulti',
  'set',
  'replace',
  'add',
  'cas',
  'append',
  'prepend',
  'increment',
  'decrement',
  'incr',
  'decr',
  'del',
  'delete',
  'version',
  'flush',
  'samples',
  'slabs',
  'items',
  'flushAll',
  'samplesSettings',
  'samplesSlabs',
  'samplesItems',
  'cachedump'
];

function wrapNodule(obj,methods){
    if(!Array.isArray(methods))methods=[methods]
    var ns = require('../../../utils/continuation-local-storage').getNamespace('cavissonNamespace');
    methods.forEach(function(method){
        var original = obj[method]
        if(!original) return;
        obj[method]= function(){
            var args = arguments;
            var last = args[args.length -1]
            if(typeof last== 'function'){
                args[args.length - 1] = ns.bind(last);
            }
            return original.apply(this, args);
        }
    })
}

module.exports = function(obj) {
    wrapNodule(obj.prototype,commands)
    commands.forEach(function(command) {
      proxy.around(obj.prototype, command, function (obj, args, local) {
          if(command === 'get' && Array.isArray(args[0])) return;

          var client = obj;
          var trace = samples.stackTrace();
          var params = args;
          var time = local.time= samples.time("Memcached", command);

          var memcacheObj =local.exitCall= new tierCall();
          var requestedObj=AgentSetting.getFlowPathIdFromRequest();

          var currTimeStamp = time.begin - (AgentSetting.cavEpochDiffInMills );
          var queryStartTimeSec = (currTimeStamp - requestedObj.cavTimeInMillis) / 1000;
          var fpId;
          if(!requestedObj) {
              return;
          }
          if(requestedObj.cavFlowPathId)
              fpId = requestedObj.cavFlowPathId;
          else if(requestedObj.cavHsFlowPathId)
              fpId=requestedObj.cavHsFlowPathId
          else
              return;
          if (fpId.indexOf(":") == -1)                 //Getting only current fpid, not with parent id .
              fpId = fpId;
          else
              fpId = fpId.split(":")[0];

          var flowpathObj = AgentSetting.flowMap[fpId];
          if(!flowpathObj)
              return

          memcacheObj.seqId = ++flowpathObj.seqId ;
          var obj = {'Type': 'MemCache',
              'Servers': client.servers,
              'Command': command,
              'Arguments': samples.truncate(params),
              'Stack trace': trace,
          };
          if(obj.Servers) {
              var address = obj.Servers[0].trim().split(':');
              obj.Servers={host:address[0],port:address[1]}
          }
          var opt = {}
          for(i in args){
              if(typeof args[i] == 'function')
                  continue;

              opt[i]=args[i]
          }
          var commandName=command+JSON.stringify(opt)
          var backendName =local.backendName= backenRecord.generateBackendName('MemCache',obj.Servers.host,obj.Servers.port)
          if(!backendName){
              ut.logger.info(AgentSetting.currentTestRun,"| Returning backend name is null")
              return
          }

          memcacheObj.methodId = ndMetaData.backendMeta(backendName);    //Dumping 5 Record
          var ht = process.hrtime();
          var totalExecTime = ((ht[0] * 1000000 + Math.round(ht[1] / 1000)) - time._begin) / 1000;

          memcacheObj.executionTime = parseInt(totalExecTime);
          memcacheObj.backendType = 5;
          memcacheObj.queryStartTimeSec = parseInt(queryStartTimeSec);
          memcacheObj.subType = ndSQLMetaData.setNonPrepared(commandName, fpId);    //dumping 23 meta record

          flowpathObj.calls.push(memcacheObj);
          var hasCallback =proxy.callback(args, -1, function(obj, args) {
              if(!time.done()) return;

              var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;

              memcacheObj.executionTime = time.ms;
              backenRecord.handleBackendRecord(obj, parseInt(memcacheObj.executionTime), backendName);
          });
          /* if(!hasCallback){
           if(!time.done()) return;
           memcacheObj.executionTime = time.ms;
           console.log("Dumping backend from hasCallback",memcacheObj)
           }*/
      }, function(obj, args, ret, locals) { // Evented API{
          var memcacheObj=locals.exitCall;
          var time = locals.time;
          var backendName = locals.backendName;
          if(!backendName){
              ut.logger.info(AgentSetting.currentTestRun,"| Returning backend name is null")
              return
          }

          var hasCallback = proxy.callback(args, -1, function(obj, args) {
              if(!time.done()) return;

              var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;
              memcacheObj.executionTime = time.ms;
              backenRecord.handleBackendRecord(obj, parseInt(memcacheObj.executionTime), backendName);
          });
          if(!hasCallback) {
              if(!time.done()) return;
              memcacheObj.executionTime = time.ms;
              backenRecord.handleBackendRecord('200', parseInt(memcacheObj.executionTime), backendName);
          }

      })
    /*proxy.before(obj.prototype, command, function(obj, args) {
        //locals.obj = obj
            // ignore, getMulti will be called
      if(command === 'get' && Array.isArray(args[0])) return;

        var client = obj;
        var trace = samples.stackTrace();
        var params = args;
        var time = samples.time("Memcached", command);

        var memcacheObj = new tierCall();
        var requestedObj=AgentSetting.getFlowPathIdFromRequest();

        var currTimeStamp = time.begin - (AgentSetting.cavEpochDiffInMills );
        var queryStartTimeSec = (currTimeStamp - requestedObj.cavTimeInMillis) / 1000;

        if(requestedObj == undefined)
            return ;

        var fpId = requestedObj.flowPathId;
        if (fpId.indexOf(":") == -1)                 //Getting only current fpid, not with parent id .
            fpId = fpId;
        else
            fpId = fpId.split(":")[0];

        var flowpathId = AgentSetting.flowMap[requestedObj.flowPathId];
        memcacheObj.seqId = AgentSetting.seqId = AgentSetting.seqId + 1;

        var obj = {'Type': 'Memcached',
            'Servers': client.servers,
            'Command': command,
            'Arguments': samples.truncate(params),
            'Stack trace': trace,
        };
        var backendName = obj.Type + '_' + obj.Servers;
        memcacheObj.methodId = ndMetaData.backendMeta(backendName);    //Dumping 5 Record
        var ht = process.hrtime();
        var totalExecTime = ((ht[0] * 1000000 + Math.round(ht[1] / 1000)) - time._begin) / 1000;

        memcacheObj.executionTime = parseInt(totalExecTime);
        memcacheObj.backendType = 2;
        memcacheObj.queryStartTimeSec = parseInt(queryStartTimeSec);
        memcacheObj.subType = ndSQLMetaData.setNonPrepared(command, fpId);    //dumping 23 meta record

        flowpathId.calls.push(memcacheObj);

      var hasCallback = proxy.callback(args, -1, function(obj, args) {
        if(!time.done()) return;

        var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;

        memcacheObj.executionTime = time.ms;
          console.log(time.ms," : In callback : ",memcacheObj)
          backenRecord.handleBackendRecord(obj, parseInt(memcacheObj.executionTime), backendName);
      });

      if(!hasCallback) {
          if(!time.done()) return;

          memcacheObj.executionTime = time.ms;
          console.log(time.ms," : In hasCallback : ",memcacheObj)
          backenRecord.handleBackendRecord('200', parseInt(memcacheObj.executionTime), backendName);
      }
    });*/
  });
};

