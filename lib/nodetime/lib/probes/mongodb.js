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

var asSettingObj = require('../../../autoSensor/autoSensorSetting');
var asManagerFile = require('../../../autoSensor/autoSensorManager');
var entryPointManager = require('../../../utils/NDEntryPointManager');
var subType ;

var DB_OPS = [
    'addUser',
    'authenticate',
    'collection',
    'collectionNames',
    'collections',
    'command',
    'createCollection',
    'createIndex',
    'cursorInfo',
    'dereference',
    'dropCollection',
    'dropDatabase',
    'dropIndex',
    'ensureIndex',
    'eval',
    'executeDbAdminCommand',
    'indexInformation',
    'logout',
    'open',
    'reIndex',
    'removeUser',
    'renameCollection',
    'stats',
    '_executeInsertCommand',
    '_executeQueryCommand'
]

var COLLECTION_OPS = [
    'aggregate',
    'bulkWrite',
    'count',
    'createIndex',
    'deleteMany',
    'deleteOne',
    'distinct',
    'drop',
    'dropAllIndexes',
    'dropIndex',
    'ensureIndex',
    'findAndModify',
    'find',
    'findAndRemove',
    'findOne',
    'findOneAndDelete',
    'findOneAndReplace',
    'findOneAndUpdate',
    'geoHaystackSearch',
    'geoNear',
    'group',
    'indexes',
    'indexExists',
    'indexInformation',
    'insert',
    'insertMany',
    'insertOne',
    'isCapped',
    'mapReduce',
    'options',
    'parallelCollectionScan',
    'reIndex',
    'remove',
    'rename',
    'replaceOne',
    'save',
    'stats',
    'update',
    'updateMany',
    'updateOne'
]

var GRID_OPS = [
    'put',
    'get',
    'delete'
]

var CURSOR_OPS = [
    'nextObject',
    'next',
    'findById',
    'toArray',
    'count',
    'explain'
]

var core_commands=[ 'MongoError',
    'Admin',
    //'MongoClient', it is treated as object not command/function, issue in wallsgreen so removing this command
    'Db',
    'ReplSet',
    'Mongos',
    'ReadPreference',
    'GridStore',
    'Chunk',
    'Logger',
    'Cursor',
    'GridFSBucket',
    'CoreServer',
    'CoreConnection',
    'Binary',
    'Code',
    'Map',
    'DBRef',
    'Double',
    'Int32',
    'Long',
    'MinKey',
    'MaxKey',
    'ObjectID',
    'ObjectId',
    'Symbol',
    'Timestamp',
    'Decimal128',
    'connect',
    'instrument' ]
var commands = [
    'cursor', 'insert', 'update', 'remove'
];

function makeWrappedCallback(callback, frameLocation) {
    // add a fake stack frame. we can't get a real one since we aren't inside the original function
    var time =new Date().getTime()
    return function() {
        try {
            global.cavisson_event_callback_releation_data = 'Source - Mongo.'+frameLocation +'; Delay:'+ time
            var ret = callback.apply(this, arguments);
            global.cavisson_event_callback_releation_data = undefined
            return ret;
        } catch (e) {
            console.error("Uncaught " + e.stack);
        }
    }
}

function wrapNodule(nodule, methods){
    if (!Array.isArray(methods)) methods = [methods]

    var ns = require('../../../utils/continuation-local-storage').getNamespace('cavissonNamespace');
    methods.forEach(function(method){
        var original = nodule[method]
        if(!original) return;
        var sourcePosition = (nodule.constructor.name || Object.prototype.toString.call(nodule)) + "." + method;
        nodule[method]= function(){
            var args = arguments;
            var last = args[args.length -1]
            if(typeof last === 'function') {
                last = makeWrappedCallback(args[args.length -1],sourcePosition,args.length -2)
                args[args.length - 1] = ns.bind(last);
            }
            return original.apply(this, args);
        }
    })
}

module.exports = function (obj) {

    if (obj.Cursor && obj.Cursor.prototype ) {
        wrapNodule(
            obj.Cursor.prototype,
            CURSOR_OPS
        )
    }
    if(obj){
        wrapNodule(
            obj,
            core_commands
        )
    }
    if(obj.Collection && obj.Collection.prototype) {
        wrapNodule(
            obj.Collection.prototype,
            COLLECTION_OPS
        )
        commands.forEach(function (commands) {
            try {
                var commandName = commands == 'cursor' ? 'find' : commands;
                proxy.before(obj.Server.prototype, commands, function (obj, args) {
                    if(entryPointManager.isMongoExitPointConfigured == 0) return;
                    var stackTrace = samples.stackTrace();
                    if (commandName == 'cursor' && !args[1].find) return;

                    var requestedObj = AgentSetting.getFlowPathIdFromRequest();
                    if (requestedObj == undefined)
                        return;

                    var mongoObj = new tierCall();
                    var time = samples.time("MongoDB", commandName);
                    var command = (args && args.length > 0) ? args[0] : undefined;

                    var currTimeStamp = time.begin - (AgentSetting.cavEpochDiffInMills );
                    var queryStartTimeMills = (currTimeStamp - requestedObj.cavTimeInMillis);
                    var queryStartTimeInMillis = (queryStartTimeMills);

                    var fpId = requestedObj.cavFlowPathId;
                    if(!fpId)
                        return;
                    if (fpId.indexOf(":") == -1)                 //Getting only current fpid, not with parent id .
                        fpId = fpId;
                    else
                        fpId = fpId.split(":")[0];


                    var conn = {};
                    conn.server = {};
                    var serverDetail = obj.s || obj.serverDetails;
                    if (serverDetail) {
                        if (serverDetail.host && serverDetail.port) {
                            conn.server={host:serverDetail.host,port:serverDetail.port}
                        }
                        else if (serverDetail.server && serverDetail.server.s && serverDetail.server.s.serverDetails.host && serverDetail.server.s.serverDetails.port) {
                            //conn.server.push(serverDetail.server.s.serverDetails.host + '_' + serverDetail.server.s.serverDetails.port);
                            conn.server={host:serverDetail.server.s.serverDetails.host,port:serverDetail.server.s.serverDetails.port}
                        }
                        else if (serverDetail.topologyOptions && serverDetail.topologyOptions.host && serverDetail.topologyOptions.port) {
                            //conn.server.push(serverDetail.topologyOptions.host + '_' + serverDetail.topologyOptions.port);
                            conn.server={host:serverDetail.topologyOptions.host,port:serverDetail.topologyOptions.port}
                        }
                    }
                    var query,
                        completeCommandName;

                    if (args[0] && args[1]) {
                        var commandArg = JSON.stringify(args[1].query ? args[1].query : args[1]);
                        completeCommandName= args[0]+'_'+commandName+commandArg
                    }
                    var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;
                    var obj = {
                        'Type': 'MongoDB',
                        'Connection': conn.server
                    };

                    var backendName = backenRecord.generateBackendName('MONGO',conn.server.host,conn.server.port)
                    //var backendName = obj.Type + '_' + obj.Connection;
                    mongoObj.methodId = ndMetaData.backendMeta(backendName);    //Dumping 5 Record
                    var flowpathObj = AgentSetting.flowMap[fpId];

                    var ht = process.hrtime();
                    var totalExecTime = ((ht[0] * 1000000 + Math.round(ht[1] / 1000)) - time._begin) / 1000;

                    mongoObj.seqId = ++requestedObj.seqId ;
                    mongoObj.executionTime = parseInt(totalExecTime);
                    mongoObj.backendType = 15;
                    mongoObj.queryStartTimeMills = parseInt(queryStartTimeMills);
                    mongoObj.subType = ndSQLMetaData.setNonPrepared(completeCommandName, fpId);    //dumping 23 meta record

                    flowpathObj.calls.push(mongoObj)

                    var hasCallback = proxy.callback(args, -1, function (obj, args) {
                        //var statusCode = args[0] ? args[0].statusCode : undefined;
                        if(time.done()) {
                            //var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;
                            mongoObj.executionTime = time.ms;
                            takeHotspotData(parseInt(mongoObj.executionTime),(+queryStartTimeInMillis + +requestedObj.cavTimeInMillis),fpId,stackTrace);
                            backenRecord.handleBackendRecord('200', parseInt(mongoObj.executionTime), backendName);
                        }
                    });
                    if (!hasCallback) {
                        if(time.done()) {
                            mongoObj.executionTime = time.ms;
                            takeHotspotData(parseInt(mongoObj.executionTime),(+queryStartTimeInMillis + +requestedObj.cavTimeInMillis),fpId,stackTrace);
                            backenRecord.handleBackendRecord('200', parseInt(mongoObj.executionTime), backendName);
                        }
                    }
                });
            }
            catch (err) {
                ut.logger.warn(err)
            }
        });
    }

    if (obj.Db && obj.Db.prototype && obj.Db.prototype._executeQueryCommand)
    {
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
        internalCommands.forEach(function (internalCommand) {

            var command = commandMap[internalCommand] || internalCommand;

            proxy.before(obj.Db.prototype, internalCommand, function(obj, args)
            {
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
                    // var query = command.query ? samples.truncate(JSON.stringify(command.query)) : '{}';
                    var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;
                    var obj = {
                        'Type': 'MongoDB',
                        'Connection': conn,
                        'Command': {
                            collectionName: command.collectionName,
                            commandName: commandName,
                            //query: query,
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

function takeHotspotData (endTime,startTime,flowpathId,stackTrace) {
    try {
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
