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


var nt = require('../nodetime');
var proxy = require('../proxy');
var samples = require('../samples');
var backendRecord = require ('../../../backend/backendRecord.js');
var tierCall = require("../../../flowpath/tierCall").tierCall;
var ndMetaData = require('../../../metaData/ndMethodMetaData');
var ut = require('../../../util');
var AgentSetting = require("../../../agent-setting");
var domain = require('domain');
var ndSQLProcessor = require('../../../flowpath/ndSQLProcessor');
var ndSQLMetaData = require('../../../metaData/ndSQLMetaData');

var asSettingObj = require('../../../autoSensor/autoSensorSetting');
var asManagerFile = require('../../../autoSensor/autoSensorManager');

var queryStartTimeSec ;
var startTime;

var commands = [
    "append",
    "auth",
    "bgrewriteaof",
    "bgsave",
    "blpop",
    "brpop",
    "brpoplpush",
    "config get",
    "config set",
    "config resetstat",
    "dbsize",
    "debug object",
    "debug segfault",
    "decr",
    "decrby",
    "del",
    "discard",
    "echo",
    "exec",
    "exists",
    "expire",
    "expireat",
    "flushall",
    "flushdb",
    "get",
    "getbit",
    "getrange",
    "getset",
    "hdel",
    "hexists",
    "hget",
    "hgetall",
    "hincrby",
    "hkeys",
    "hlen",
    "hmget",
    "hmset",
    "hset",
    "hsetnx",
    "hvals",
    "incr",
    "incrby",
    "info",
    "keys",
    "lastsave",
    "lindex",
    "linsert",
    "llen",
    "lpop",
    "lpush",
    "lpushx",
    "lrange",
    "lrem",
    "lset",
    "ltrim",
    "mget",
    "monitor",
    "move",
    "mset",
    "msetnx",
    "multi",
    "object",
    "persist",
    "ping",
    "psubscribe",
    "publish",
    "punsubscribe",
    "quit",
    "randomkey",
    "rename",
    "renamenx",
    "rpop",
    "rpoplpush",
    "rpush",
    "rpushx",
    "sadd",
    "save",
    "scard",
    "sdiff",
    "sdiffstore",
    "select",
    "set",
    "setbit",
    "setex",
    "setnx",
    "setrange",
    "shutdown",
    "sinter",
    "sinterstore",
    "sismember",
    "slaveof",
    "smembers",
    "smove",
    "sort",
    "spop",
    "srandmember",
    "srem",
    "strlen",
    "subscribe",
    "sunion",
    "sunionstore",
    "sync",
    "ttl",
    "type",
    "unsubscribe",
    "unwatch",
    "watch",
    "zadd",
    "zcard",
    "zcount",
    "zincrby",
    "zinterstore",
    "zrange",
    "zrangebyscore",
    "zrank",
    "zrem",
    "zremrangebyrank",
    "zremrangebyscore",
    "zrevrange",
    "zrevrangebyscore",
    "zrevrank",
    "zscore",
    "zunionstore"
];
function wrapNodule(obj,methods){
    if(!Array.isArray(methods))methods=[methods]
    var ns = require('../../../utils/continuation-local-storage').getNamespace('cavissonNamespace');
    methods.forEach(function(method){
        var original = obj[method]

        obj[method]= function(){
            var args = arguments;
            var last = args[args.length -1]
            if(typeof last== 'function')
            {
                args[args.length - 1] = ns.bind(last);
            }
            return original.apply(this, args);
        }
    })
}

module.exports = function(obj) {
  proxy.after(obj, 'createClient', function(obj, args, ret) {
      try {
          var client = ret;
          wrapNodule(
              ret,
              commands
          )
          commands.forEach(function (command) {
              proxy.before(ret, command, function (obj, args) {
                  var trace = samples.stackTrace();
                  var requestedObj=AgentSetting.getFlowPathIdFromRequest();

                  if(!requestedObj){
                      return;
                  }
                  var redisObj = new tierCall()
                  var time = samples.time("Redis", command);
                  queryStartTimeSec = ((time.begin - AgentSetting.cavEpochDiffInMills ) - requestedObj.timeInMillis) / 1000;
                  var queryStartTimeInMillis = (queryStartTimeSec) * 1000;

                  var obj = {
                      'Type': 'Redis',
                      'Connection': {host: client.options.host, port: client.options.port},
                      'Command': command
                  };

                  var backendName = obj.Type + '_' + obj.Connection.host + '_' + obj.Connection.port;
                 // ut.logger.info(AgentSetting.currentTestRun+" | Creating Backend meta record for : " + backendName);

                   redisObj.seqId = AgentSetting.seqId = AgentSetting.seqId + 1;
                  var opt={};

                  for (i in args) {
                      if(typeof args[i] ==='function')
                        continue

                      opt[i]=args[i]
                  }
                  var commandName = command+JSON.stringify(opt)
                  var flowpathObj = AgentSetting.flowMap[requestedObj.flowPathId];
                  var fpId = requestedObj.flowPathId;
                  if(!fpId)
                    return;

                  if (fpId.indexOf(":") == -1)                 //Getting only current fpid, not with parent id .
                      fpId = fpId;
                  else
                      fpId = fpId.split(":")[0];

                  var ht = process.hrtime();
                  totalExecTime = ((ht[0] * 1000000 + Math.round(ht[1] / 1000)) - time._begin) / 1000;

                  //Creating "T" Object that contain all data  required to create T_record

                   redisObj.methodId = ndMetaData.backendMeta(backendName)
                   redisObj.backendType = 16;
                   redisObj.queryStartTimeSec = parseInt(queryStartTimeSec);
                   redisObj.subType = ndSQLMetaData.setNonPrepared(commandName, fpId);      //dumping 23 meta record
                   redisObj.executionTime = totalExecTime;

                  flowpathObj.calls.push( redisObj);

                  var Callback = proxy.callback(args, -1, function (obj, args) {
                      if (!time.done()) return;
                      var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;

                       redisObj.executionTime = time.ms;
                      var status = '200'
                      takeHotspotData(parseInt(redisObj.executionTime),(+queryStartTimeInMillis + +requestedObj.timeInMillis),fpId,trace);
                      backendRecord.handleBackendRecord(status, parseInt( redisObj.executionTime), backendName);

                      //samples.add(time, obj, 'Redis: ' + command);
                  });
                  if(!Callback)
                  {
                      if (time.done()) {
                          try {
                              redisObj.executionTime = time.ms;

                              var status = '200'
                              takeHotspotData(parseInt(redisObj.executionTime),(+queryStartTimeInMillis + +requestedObj.timeInMillis),fpId,trace);
                              backendRecord.handleBackendRecord(status, parseInt(redisObj.executionTime), backendName);
                          } catch (err) {
                              ut.logger.warn(agentSetting.currentTestRun + " | Error in creating Backend : " + err);
                          }
                      }
                  }
              });
          });
      }
      catch(err){ut.logger.warn(AgentSetting.currentTestRun+" | "+err)}
  });
};


function takeHotspotData (endTime,startTime,flowpathId,stackTrace) {
    try {
        //var stackTrace = asManagerFile.stackTrace();  //Getting Stack Trace for particular method.
        if (asSettingObj.asSampleInterval > 0) {
            if (endTime > asSettingObj.threshold) {
                process.nextTick(function () {
                    asManagerFile.handledHotspotData(stackTrace, endTime, startTime, flowpathId, "", process.pid, (new Date().getTime() - AgentSetting.cavEpochDiffInMills));
                });
            }
        }
    }catch (err) {
        util.logger.warn("Getting Error in AS :-  " + err);
    }
}
