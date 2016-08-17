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
var ut = require('../../../util');
var AgentSetting = require("../../../agent-setting");
var domain = require('domain');
var ndSQLProcessor = require('../../../flowpath/ndSQLProcessor');
var subType ;
var queryStartTimeSec ;

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


module.exports = function(obj) {
  proxy.after(obj, 'createClient', function(obj, args, ret) {
      try {

          var client = ret;

          commands.forEach(function (command) {

              proxy.before(ret, command, function (obj, args) {
                  if (nt.paused) return;

                  var trace = samples.stackTrace();
                  var time = samples.time("Redis", command);
                  var params = args;


                  var getNamespace = require('continuation-local-storage').getNamespace,
                      namespace = getNamespace('cavissonNamespace');

                  var requestedObj = namespace.get('httpReq');
                  ut.logger.info("Flowpathid for Rediss 'T' is : " + requestedObj.flowPathId)
                  var obj = {
                      'Type': 'Redis',
                      'Connection': {host: client.options.host, port: client.options.port},
                      'Command': command
                  };


                  var backendName = obj.Type + '_' + obj.Connection.host + '_' + obj.Connection.port;

                  ut.logger.info("Creating Backend meta record for : " + backendName);
                  backendRecord.dumpBackendMetaData(backendName);                 //Dumping 5 Record

                  AgentSetting.seqId = AgentSetting.seqId + 1;
                  var d1 = domain.create();
                  d1.seqId = AgentSetting.seqId;

                  var flowpathId = AgentSetting.flowMap[requestedObj.flowPathId];
                  var fpId = requestedObj.flowPathId;

                  if (fpId.indexOf(":") == -1)                 //Getting only current fpid, not with parent id .
                      fpId = fpId;
                  else
                      fpId = fpId.split(":")[0];

                  if (AgentSetting.queryMap[command] == undefined) {
                      var currTimeStamp = time.begin - (AgentSetting.cavEpochDiff * 1000 );
                      queryStartTimeSec = (currTimeStamp - requestedObj.timeInMillis) / 1000;

                      AgentSetting.queryId = AgentSetting.queryId + 1;
                      subType = AgentSetting.queryId

                      AgentSetting.queryMap[command] = AgentSetting.queryId;
                      ut.logger.info("Generating Query Meta record for PG");

                      ndSQLProcessor.dumpNonPreparedSQLQueryEntry(command, fpId, AgentSetting.queryId);
                  }
                  console.log(AgentSetting.queryMap)
                  var ht = process.hrtime();
                  totalExecTime = ((ht[0] * 1000000 + Math.round(ht[1] / 1000)) - time._begin) / 1000;

                  //Creating "T" Object that contain all data  required to create T_record
                  ut.logger.info("Creating T_Object for Pg with Initial time .");

                  console.log(command)

                  var pgObj = new tierCall();
                  pgObj.methodId = AgentSetting.backendMetaMap[backendName];
                  d1.run(function () {
                      pgObj.seqId = process.domain.seqId
                  })
                  pgObj.backendType = 2;
                  pgObj.queryStartTimeSec = parseInt(queryStartTimeSec);
                  pgObj.subType = subType;
                  pgObj.executionTime = totalExecTime;


                  var Callback = proxy.callback(args, -1, function (obj, args) {
                      if (pgObj) {
                          if (!time.done()) return;
                          // flowpathId.calls.push(pgObj);
                      }
                  });

                  if (pgObj && !Callback) {
                      if (pgObj.executionTime) {
                          ut.logger.info("Pushing  T_Object in array.");
                          flowpathId.calls.push(pgObj);
                          //backendRecord.handleBackendRecord(obj ,parseInt(pgObj.executionTime), backendName);
                      }
                  }

                  proxy.callback(args, -1, function (obj, args) {
                      if (!time.done()) return;

                      var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;


                      ut.logger.info("Creating T_Object for Pg with Actual time .");
                      pgObj.executionTime = time.ms;
                      console.log(pgObj);

                      //flowpathId.calls.push(pgObj);
                      backendRecord.handleBackendRecord(obj, parseInt(pgObj.executionTime), backendName);

                      samples.add(time, obj, 'Redis: ' + command);
                  });
              });
          });
      }
      catch(err){ut.logger.warn(err)}
  });
};

