/*
 /!*
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
 *!/


 var nt = require('../nodetime');
 var proxy = require('../proxy');
 var samples = require('../samples');
 var backenRecord = require ('../../../backend/backendRecord.js');
 var ut = require('../../../util');
 var AgentSetting = require("../../../agent-setting");


 module.exports = function(obj) {

 // Native, reinitialize probe
 proxy.getter(obj, 'native', function(obj, ret) {
 proxy.after(ret, 'Client', function(obj, args, ret) {
 probe(ret.__proto__);
 });
 });

 probe(obj.Client.prototype);
 };


 var probe = function(obj) {
 if (obj.__probeInstalled__) return;
 obj.__probeInstalled__ = true;

 // Callback API
 proxy.before(obj, 'query', function (obj, args, ret) {
 if (nt.paused) return;

 var client = obj;
 var trace = samples.stackTrace();
 var command = args.length > 0 ? args[0] : undefined;
 var params = args.length > 1 && Array.isArray(args[1]) ? args[1] : undefined;
 var time = samples.time("PostgreSQL", "query");

 proxy.callback(args, -1, function (obj, args) {

 if (!time.done()) return;

 var error = args.length > 0 && args[0] ? args[0].message : undefined;
 var obj = {
 'Type': 'PostgreSQL',
 //'Connection': {host: client.host, port: client.port, user: client.user, database: client.database ? client.database : undefined},
 'Connection': (client.host + '_' + client.port),
 'Command': samples.truncate(command),
 'Arguments': samples.truncate(params),
 'Stack trace': trace,
 'Error': error
 };

 samples.add(time, obj, 'PostgreSQL: ' + obj['Command']);
 });
 });


 proxy.after(obj, 'connect', function (obj, args, ret) {

 var props;
 var supportedProperties = {
 'HOST': obj.host,
 'PORT': obj.port,
 'DATABASE': obj.database,
 'VERSION': undefined,
 'VENDOR': 'POSTGRESQL'
 };


 obj.connection.on('parameterStatus', function (msg) {
 if (msg.parameterName !== 'server_version') {
 return;
 }
 supportedProperties.VERSION = msg.parameterValue;
 });

 // Callback API
 proxy.around(obj, 'query', function (obj, args, locals) {
 if (!props) {

 if (args.length > 0 && typeof args[args.length - 1] === 'function') return;

 var client = obj;
 var trace = samples.stackTrace();
 var command = args.length > 0 ? args[0] : undefined;
 var params = args.length > 1 && Array.isArray(args[1]) ? args[1] : undefined;
 var time = samples.time("PostgreSQL", "query");

 proxy.before(ret, 'on', function (obj, args)
 {
 var event = args[0];

 if (event !== 'end' && event !== 'error') return;

 proxy.callback(args, -1, function (obj, args) {

 var getNamespace = require('continuation-local-storage').getNamespace,
 namespace = getNamespace('cavissonNamespace');


 var requestedObj = namespace.get('httpReq');
 var flw = AgentSetting.flowMap[requestedObj.flowPathId].seqblob;

 AgentSetting.seqId = AgentSetting.seqId + 1;
 var backendName = supportedProperties.VENDOR + '_' + supportedProperties.HOST + '_' + supportedProperties.PORT;

 backenRecord.handleBackendRecord(obj, time, backendName);

 var methodId = AgentSetting.backendRecordMap[backendName].methodId;
 var tot = flw + 'T' + AgentSetting.seqId + ':' + methodId + ':' + parseInt(time.ms) + ':' + '2' + ':' + '-' + '_';
 AgentSetting.flowMap[requestedObj.flowPathId].seqblob = tot;
 samples.add(time, obj, 'PostgreSQL: ' + obj['Command']);
 });
 });
 }
 },
 function(obj, args, ret, locals) {
 try {

 console.log("111111111111111111");
 var getNamespace = require('continuation-local-storage').getNamespace,
 namespace = getNamespace('cavissonNamespace');

 if (nt.paused) return;

 var requestedObj = namespace.get('httpReq');

 // If has a callback, ignore

 if (args.length > 0 && typeof args[args.length - 1] === 'function') return;

 var client = obj;
 var trace = samples.stackTrace();
 var command = args.length > 0 ? args[0] : undefined;
 var params = args.length > 1 && Array.isArray(args[1]) ? args[1] : undefined;
 var time = samples.time("PostgreSQL", "query");

 proxy.before(ret, 'on', function (obj, args) {

 console.log("222222222222222");
 var event = args[0];

 if (event !== 'end' && event !== 'error') return;

 proxy.callback(args, -1, function (obj, args) {
 console.log("33333333333333");
 if (!time.done()) return;

 var error = (event === 'error' && args.length > 0) ? args[0].message : undefined;
 var obj = {
 'Type': 'PostgreSQL',
 //'Connection': {host: client.host, port: client.port, user: client.user, database: client.database ? client.database : undefined},
 'Connection': (client.host + '_' + client.port),
 'Command': samples.truncate(command),
 'Params': samples.truncate(params),
 'Stack trace': trace,
 'Error': error
 };
 console.log(requestedObj);
 console.log(requestedObj.flowPathId);
 console.log(AgentSetting.flowMap[requestedObj.flowPathId].seqblob);
 var flw = AgentSetting.flowMap[requestedObj.flowPathId].seqblob;
 console.log("flw for pg : "+flw);

 AgentSetting.seqId = AgentSetting.seqId + 1;
 var backendName = obj.Type + '_' + obj.Connection;

 backenRecord.handleBackendRecord(obj, time, backendName);

 var methodId = AgentSetting.backendRecordMap[backendName].methodId;
 var tot = flw + 'T' + AgentSetting.seqId + ':' + methodId + ':' + parseInt(time.ms) + ':' + '2' + ':' + '-' + '_';
 console.log(tot);
 AgentSetting.flowMap[requestedObj.flowPathId].seqblob = tot;
 samples.add(time, obj, 'PostgreSQL: ' + obj['Command']);

 });
 });
 }
 catch (err) {
 console.log("Error in pg.js : " + err.stack);
 }
 });
 });
 }




 */






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
var AgentSetting = require("../../../agent-setting");
var domain = require('domain');

module.exports = function(obj) {

    // Native, reinitialize probe
    proxy.getter(obj, 'native', function(obj, ret) {
        proxy.after(ret, 'Client', function(obj, args, ret) {
            probe(ret.__proto__);
        });
    });

    probe(obj.Client.prototype);
};


var probe = function(obj) {
    if(obj.__probeInstalled__) return;
    obj.__probeInstalled__ = true;

    // Callback API
    proxy.before(obj, 'query', function(obj, args, ret) {
        if(nt.paused) return;
        var requestedObj = ut.getRequestObject(args);

        var flw = AgentSetting.flowMap[requestedObj.flowPathId].seqblob;
        AgentSetting.seqId = AgentSetting.seqId + 1;

        var client = obj;
        var trace = samples.stackTrace();
        var command = args.length > 0 ? args[0] : undefined;
        var params = args.length > 1 && Array.isArray(args[1]) ? args[1] : undefined;
        var time = samples.time("PostgreSQL", "query");

        proxy.callback(args, -1, function(obj, args) {

            if(!time.done()) return;

            var error = args.length > 0 && args[0] ? args[0].message : undefined;
            var obj = {'Type': 'PostgreSQL',
                //'Connection': {host: client.host, port: client.port, user: client.user, database: client.database ? client.database : undefined},
                'Connection': (client.host + '_' + client.port),
                'Command': samples.truncate(command),
                'Arguments': samples.truncate(params),
                'Stack trace': trace,
                'Error': error};
            var backendName = obj.Type + '_' + obj.Connection ;

            backenRecord.handleBackendRecord(obj ,time, backendName);

            var backendID = AgentSetting.backendRecordMap[backendName].backendID;
            var tot = flw + 'T' + AgentSetting.seqId + ':' + backendID + ':' + parseInt(time.ms) + ':' + '2' + ':' + '-' + '_' ;

            AgentSetting.flowMap[requestedObj.flowPathId].seqblob = tot;
            samples.add(time, obj, 'PostgreSQL: ' + obj['Command']);
        });
    });


    // Evented API
    proxy.after(obj, 'query', function(obj, args, ret) {

        if(nt.paused) return;

        var getNamespace = require('continuation-local-storage').getNamespace,
         namespace = getNamespace('cavissonNamespace');

         var requestedObj=namespace.get('httpReq');


        AgentSetting.seqId = AgentSetting.seqId + 1;
        var d1 =  domain.create();
        d1.seqId = AgentSetting.seqId ;

         // If has a callback, ignore
        if(args.length > 0 && typeof args[args.length - 1] === 'function') return;

        var client = obj;
        var trace = samples.stackTrace();
        var command = args.length > 0 ? args[0] : undefined;
        var params = args.length > 1 && Array.isArray(args[1]) ? args[1] : undefined;
        var time = samples.time("PostgreSQL", "query");

        proxy.before(ret, 'on', function(obj, args) {
            var event = args[0];

            if(event !== 'end' && event !== 'error') return;

            proxy.callback(args, -1, function(obj, args) {


                if(!time.done()) return;

                var error = (event === 'error' && args.length > 0) ? args[0].message : undefined;
                var obj = {'Type': 'PostgreSQL',
                    //'Connection': {host: client.host, port: client.port, user: client.user, database: client.database ? client.database : undefined},
                    'Connection': (client.host + '_' + client.port),
                    'Command': samples.truncate(command),
                    'Params': samples.truncate(params),
                    'Stack trace': trace,
                    'Error': error};

                var flw = AgentSetting.flowMap[requestedObj.flowPathId].seqblob;

                var backendName = obj.Type + '_' + obj.Connection ;

                backenRecord.handleBackendRecord(obj ,time, backendName);
                var methodId = AgentSetting.backendRecordMap[backendName].methodId;

                var tot;
                d1.run(function(){
                    tot = flw + 'T' + AgentSetting.seqId + ':' + methodId + ':' + parseInt(time.ms) + ':' + '2' + ':' + '-' + '_' ;
                });

                AgentSetting.flowMap[requestedObj.flowPathId].seqblob = tot;

                samples.add(time, obj, 'PostgreSQL: ' + obj['Command']);

            });
        });
    });


};
