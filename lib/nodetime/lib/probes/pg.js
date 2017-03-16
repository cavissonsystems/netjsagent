
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
var ndMetaData = require('../../../metaData/ndMethodMetaData');
var ndSQLMetaData = require('../../../metaData/ndSQLMetaData');
var queryStartTimeSec ;

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
    proxy.after(obj, 'connect', function(obj, args, ret)
    {
        try {

            var backendName ;

            proxy.around(obj, 'query', function (obj, args, local) {
                // If has a callback, ignore
                if (args.length > 0 && typeof args[args.length - 1] === 'function') return;
                var trace = samples.stackTrace();
                var client = obj;
                var command = args.length > 0 ? args[0] : undefined;
                var params = args.length > 1 && Array.isArray(args[1]) ? args[1] : undefined;
                var time = samples.time("PostgreSQL", "query");
                local.time=time;
                local.command =command;

                var pgObj = new tierCall();
                local.exitCall = pgObj;
                local.obj = obj;

                var requestedObj=AgentSetting.getFlowPathIdFromRequest();
                if (!requestedObj)
                    return;
                var object = {
                    'HOST': obj.host,
                    'PORT': obj.port,
                    'DATABASE': obj.database,
                    'VERSION': undefined,
                    'VENDOR': 'POSTGRESQL'
                };
                backendName = backendRecord.generateBackendName('POSTGRESQL',object.HOST,object.PORT)
                //backendName = object.VENDOR + '_' + object.HOST + '_' + object.PORT;
                /*
                 Generating Seqid for tier callout, that would be unique for every callout .
                 */
                var flowpathObj = AgentSetting.flowMap[requestedObj.flowPathId];
                var fpId = requestedObj.flowPathId;
                if(!fpId)
                    return;
                if (fpId.indexOf(":") == -1)                 //Getting only current fpid, not with parent id .
                    fpId = fpId;
                else
                    fpId = fpId.split(":")[0];

                var currTimeStamp = time.begin - (AgentSetting.cavEpochDiffInMills );
                queryStartTimeSec = (currTimeStamp - requestedObj.timeInMillis) / 1000;

                //For Query meta record (23)
                var ht = process.hrtime();
                var totalExecTime = ((ht[0] * 1000000 + Math.round(ht[1] / 1000)) - time._begin) / 1000;

                // ut.logger.info(AgentSetting.currentTestRun+" | Creating Backend meta record for : " + backendName);
                pgObj.methodId  =  ndMetaData.backendMeta(backendName);    //Dumping 5 Record

                //Creating "T" Object that contain all data  required to create T_record
                pgObj.seqId = AgentSetting.seqId = AgentSetting.seqId + 1;
                pgObj.executionTime = totalExecTime;
                pgObj.backendType = 2;
                pgObj.queryStartTimeSec = parseInt(queryStartTimeSec);
                pgObj.subType = ndSQLMetaData.setNonPrepared(command, fpId);      //dumping 23 meta record

                flowpathObj.calls.push(pgObj);

                var Callback = proxy.callback(args, -1, function (obj, args) {
                    proxy.before(res, ['on', 'once','addListener'], function (obj, args) {
                        try {

                            if(!time.done()) return;
                            pgObj.executionTime = time.ms;
                            backendRecord.handleBackendRecord(local.obj, parseInt(pgObj.executionTime), backendName);
                        }catch(err){
                            ut.logger.warn(agentSetting.currentTestRun+" | "+err);
                        }
                    });
                });

                if (!Callback) {
                    if (time.done()) {
                        try {
                            pgObj.executionTime = time.ms;
                            backendRecord.handleBackendRecord(local.obj, parseInt(pgObj.executionTime), backendName);
                        } catch (err) {
                            ut.logger.warn(agentSetting.currentTestRun + " | Error in creating Backend : " , err);
                        }
                    }
                }
            }, function(obj, args, ret, locals) { // Evented API
                var pgObj=locals.exitCall;
                var time = locals.time;
                proxy.before(ret, 'on', function (obj, args) {
                    var event = args[0];
                    if (event !== 'end' && event !== 'error') return;

                    proxy.callback(args, -1, function (obj, args) {
                        if (!time.done()) return;
                        var error = (event === 'error' && args.length > 0) ? args[0].message : undefined;
                        pgObj.executionTime = time.ms;
                        backendRecord.handleBackendRecord(obj, parseInt(pgObj.executionTime), backendName);
                    });
                });
            })
        }
        catch(err){ut.logger.warn(err)}
    });

};
