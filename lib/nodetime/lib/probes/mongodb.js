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
var ut = require('../../../util');
var domain = require('domain');
var AgentSetting = require("../../../agent-setting");

var internalCommands = [
  '_executeQueryCommand',
  '_executeInsertCommand',
  '_executeUpdateCommand',
  '_executeRemoveCommand'
];

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
    var commandName = commands == 'cursor' ? 'find' : commands ;

    proxy.before(obj.Server.prototype,commands,function(obj,args)
    {
      if (commands == 'cursor' && !args[1].find) return;

      var getNamespace = require('continuation-local-storage').getNamespace,
          namespace = getNamespace('cavissonNamespace');

      var requestedObj=namespace.get('httpReq');

      AgentSetting.seqId = AgentSetting.seqId + 1;

      var d1 =  domain.create();
      d1.seqId = AgentSetting.seqId ;


      if(nt.paused) return;

      var command = (args && args.length > 0) ? args[0] : undefined;

      var trace = samples.stackTrace();
      var time = samples.time("MongoDB" , commands);

      if(!time.done()) return;

      var conn = {};
      conn.server =[];
      var serverDetail = obj.s || obj.serverDetails;
      if(serverDetail)
      {
        if(serverDetail.host && serverDetail.port){

          conn.server.push(serverDetail.host +':'+ serverDetail.port);
        }
        else if(serverDetail.server.s.serverDetails && serverDetail.server.s.serverDetails.host && serverDetail.server.s.serverDetails.port)
        {
          conn.server.push(serverDetail.server.s.serverDetails.host +'_'+ serverDetail.server.s.serverDetails.port);
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

      var flw = AgentSetting.flowMap[requestedObj.flowPathId].seqblob;
      var backendName = obj.Type + '_' + obj.Connection;

      backenRecord.handleBackendRecord(obj, time, backendName);
      var methodId = AgentSetting.backendRecordMap[backendName].methodId;

      var tot;

      d1.run(function(){
        tot = flw + 'T' + AgentSetting.seqId + ':' + methodId + ':' + parseInt(time.ms) + ':' + '3' + ':' + '-' + '_';
      });
      AgentSetting.flowMap[requestedObj.flowPathId].seqblob = tot;

      samples.add(time, obj, 'MongoDB: ' + commandName);
    });
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


          samples.add(time, obj, 'MongoDB: ' + commandName);
        });

      });
    });
  }
};

function getServerDetails(args)
{
  var serverdetails = {};


}
