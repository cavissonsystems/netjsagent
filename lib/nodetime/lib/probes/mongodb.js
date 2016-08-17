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
var backenRecord = require ('../../../backend/backendRecord.js');
var tierCall = require("../../../flowpath/tierCall").tierCall;
var ut = require('../../../util');
var domain = require('domain');
var AgentSetting = require("../../../agent-setting");
var ndSQLProcessor = require('../../../flowpath/ndSQLProcessor');

var internalCommands = [
  '_executeQueryCommand',
  '_executeInsertCommand',
  '_executeUpdateCommand',
  '_executeRemoveCommand'
];
var subType ;
var commandMap =
{
  '_executeQueryCommand': 'find',
  '_executeInsertCommand': 'insert',
  '_executeUpdateCommand': 'update',
  '_executeRemoveCommand': 'remove'
};
module.exports = function (obj)
{
  var commands = ['cursor','insert','update','remove',];


  commands.forEach(function(commands)
  {
    try {
      var commandName = commands == 'cursor' ? 'find' : commands;

      proxy.before(obj.Server.prototype, commands, function (obj, args) {
        if (commands == 'cursor' && !args[1].find) return;

        ut.logger.info("Going to generate 'T' for MongoDB for query " + commands);

        var getNamespace = require('continuation-local-storage').getNamespace,
            namespace = getNamespace('cavissonNamespace');

        if(namespace == undefined)
              return ;

        var requestedObj = namespace.get('httpReq');
        if(requestedObj == undefined)
              return ;

        ut.logger.info("Flowpathid for PG 'T' is : " + requestedObj.flowPathId);

        var mongoObj = new tierCall();
        AgentSetting.seqId = AgentSetting.seqId + 1;

        var d1 = domain.create();
        d1.seqId = AgentSetting.seqId;

        if (nt.paused) return;

        var trace = samples.stackTrace();
        var time = samples.time("MongoDB", commands);
        var command = (args && args.length > 0) ? args[0] : undefined;

        var currTimeStamp = time.begin - (AgentSetting.cavEpochDiff * 1000 );
        var queryStartTimeSec = (currTimeStamp - requestedObj.timeInMillis) / 1000;

        var fpId = requestedObj.flowPathId;

        if (fpId.indexOf(":") == -1)                 //Getting only current fpid, not with parent id .
          fpId = fpId;
        else
          fpId = fpId.split(":")[0];

        if (AgentSetting.queryMap[commands] == undefined) {
          AgentSetting.queryId = AgentSetting.queryId + 1;
          subType = AgentSetting.queryId

          AgentSetting.queryMap[commands] = AgentSetting.queryId;
          ut.logger.info("Generating Query Meta record for Mongodb");

          ndSQLProcessor.dumpNonPreparedSQLQueryEntry(commands, fpId, AgentSetting.queryId);
        }

        if (!time.done()) return;

        var conn = {};
        conn.server = [];
        var serverDetail = obj.s || obj.serverDetails;
        if (serverDetail) {
          if (serverDetail.host && serverDetail.port) {

            conn.server.push(serverDetail.host + ':' + serverDetail.port);
          }
          else if (serverDetail.server.s.serverDetails && serverDetail.server.s.serverDetails.host && serverDetail.server.s.serverDetails.port) {
            conn.server.push(serverDetail.server.s.serverDetails.host + '_' + serverDetail.server.s.serverDetails.port);
          }
        }

        var query = command.query ? samples.truncate(JSON.stringify(command.query)) : '{}';
        var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;
        var obj = {
          'Type': 'MongoDB',
          'Connection': conn.server,
          'Command': {
            collectionName: args[0].split('.')[1],
            commandName: commandName,
            query: query,
            queryOptions: command.queryOptions,
            numberToSkip: command.numberToSkip,
            numberToReturn: command.numberToReturn
          },
          'Stack trace': trace,
          'Error': error
        };

        var backendName = obj.Type + '_' + obj.Connection;

        ut.logger.info("Creating Backend meta record for : " + backendName);
        backenRecord.dumpBackendMetaData(backendName);                 //Dumping 5 Record

        var flowpathId = AgentSetting.flowMap[requestedObj.flowPathId];

        mongoObj.methodId = AgentSetting.backendMetaMap[backendName];
        d1.run(function () {
          mongoObj.seqId = process.domain.seqId
        })
        mongoObj.executionTime = parseInt(time.ms);
        mongoObj.backendType = 2;
        mongoObj.queryStartTimeSec = parseInt(queryStartTimeSec);
        mongoObj.subType = subType;

        if(commandName == 'find')
        {
            var ht = process.hrtime();
            var totalExecTime = ((ht[0] * 1000000 + Math.round(ht[1] / 1000)) - time._begin) / 1000;
            mongoObj.executionTime = totalExecTime ;
            flowpathId.calls.push(mongoObj);

            ut.logger.info("Creating T_Object for Mongodb , but not actual time");

            backenRecord.handleBackendRecord(obj, parseInt(mongoObj.executionTime), backendName);
        }
        else{
            //proxy.callback(args, -1, function(obj, args) {
                var ht = process.hrtime();
                var totalExecTime = ((ht[0] * 1000000 + Math.round(ht[1] / 1000)) - time._begin) / 1000;
                mongoObj.executionTime = totalExecTime ;
                flowpathId.calls.push(mongoObj);
                ut.logger.info("Creating T_Object for Mongodb with Actual time .");

                backenRecord.handleBackendRecord(obj, parseInt(mongoObj.executionTime), backendName);
            //});
        }

      });
    }
    catch(err){ut.logger.warn(err)}
  });

  if (obj.Db && obj.Db.prototype && obj.Db.prototype._executeQueryCommand)
  {
    internalCommands.forEach(function (internalCommand) {

      var command = commandMap[internalCommand] || internalCommand;

      proxy.before(obj.Db.prototype, internalCommand, function(obj, args)
      {
        if (nt.paused) return;

        var trace = samples.stackTrace();

        var command = (args && args.length > 0) ? args[0] : undefined;
        var time = samples.time("MongoDB", commandMap[internalCommand]);

        proxy.callback(args, -1, function (obj, args) {

          if (!time.done()) return;

          var conn = {};
          if (command.db) {
            var servers = command.db.serverConfig;
            if (servers) {
              if (Array.isArray(servers)) {
                conn.servers = [];
                servers.forEach(function (server) {
                  conn.servers.push({host: server.host, port: server.port});
                });
              }
              else {
                conn.host = servers.host;
                conn.port = servers.port;
              }
            }

            conn.database = command.db.databaseName;
          }

          var commandName = commandMap[internalCommand];
          var query = command.query ? samples.truncate(JSON.stringify(command.query)) : '{}';
          var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;
          var obj = {
            'Type': 'MongoDB',
            'Connection': conn,
            'Command': {
              collectionName: command.collectionName,
              commandName: commandName,
              query: query,
              queryOptions: command.queryOptions,
              numberToSkip: command.numberToSkip,
              numberToReturn: command.numberToReturn
            },
            'Stack trace': trace,
            'Error': error
          };
        });

      });
    });
  }
};

function getServerDetails(args)
{
  var serverdetails = {};


}
