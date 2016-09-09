var flowpathHandler = require("../../../flowpath-handler");
var methodManager = require("../../../methodManager");
var tierCall = require("../../../flowpath/tierCall").tierCall;
var backendRecord = require('../../../backend/backendRecord');
var util = require('../../../util');
var AgentSetting = require("../../../agent-setting");
var domain = require('domain');



var nt = require('../nodetime');
var proxy = require('../proxy');
var samples = require('../samples');
var ThreadLocalSeqNumber = 0;
var http = new Object ();

module.exports = function(obj) {
    // server probe
    proxy.before(obj.Server.prototype, ['on', 'addListener'], function(obj, args) {

        if(args[0] !== 'request') return;

        proxy.callback4flowpath(args, -1, function(obj, args) {

            var req = args[0];
            var res = args[1];

            flowpathHandler.handleFlowPath(req,res,args);               //    Going to generate Flowpath
            proxy.after(res, 'end', function(obj, args) {
                methodManager.onCompleteFlowPath(req,res);
                if(!time.done()) return;

            });
        });
    });


    // client error probe
    proxy.after(obj, 'request', function(obj, args, ret) {
        if(nt.paused) return;

        var time = undefined;
        var trace = samples.stackTrace();
        var opts = args[0];

        proxy.before(ret, 'end', function(obj, args) {


            time = opts.__time__ = !opts.__time__ ? samples.time("HTTP Client", opts.method || 'GET') : undefined;
        });

        proxy.before(ret, ['on', 'addListener'], function(obj, args) {
            if(args[0] !== 'error') return;

            proxy.callback(args, -1, function(obj, args) {
                if(!time || !time.done()) return;

                var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;
                var obj = {'Type': 'HTTP',
                    'Method': opts.method,
                    'URL': (opts.hostname || opts.host) + (opts.port ? ':' + opts.port : '') + (opts.path || '/'),
                    'Request headers': opts.headers,
                    'Stack trace': trace,
                    'Error': error};
            });
        });
    });


    // client probe
    proxy.before(obj, 'request', function(obj, args) {
        try {
            var tierObj = new tierCall();

            if (nt.paused) return;

            var getNamespace = require('continuation-local-storage').getNamespace,
                namespace = getNamespace('cavissonNamespace');

            if(namespace == undefined)
                return ;

            var requestedObj = namespace.get('httpReq');
            if(requestedObj == undefined)
                return ;

            var trace = samples.stackTrace();
            var opts = args[0];
            var CavNDFPInstance = "";
            var current_fpid = requestedObj.flowPathId;

            if (current_fpid.indexOf(":") == -1)
                current_fpid = current_fpid;
            else {
                var id = current_fpid.split(":");
                current_fpid = id[0];
            }

            var object = {
                'URL': (opts.hostname || opts.host) + (opts.port ? ':' + opts.port : '') + ('/'),
                'VENDOR': 'HTTP'
            };

            var backendName = object.VENDOR + '_' + object.URL;

            AgentSetting.seqId = AgentSetting.seqId + 1;
            var d1 = domain.create();
            d1.seqId = AgentSetting.seqId;

            var flowpathId = AgentSetting.flowMap[requestedObj.flowPathId];

            var time = samples.time('HTTP Client', 'GET');

            var ht = process.hrtime();
            totalExecTime = ((ht[0] * 1000000 + Math.round(ht[1] / 1000)) - time._begin) / 1000;

            util.logger.info(AgentSetting.currentTestRun+" | Creating Backend meta record for : " + backendName);
            backendRecord.dumpBackendMetaData(backendName);                 //Dumping 5 Record

            tierObj.methodId = AgentSetting.backendMetaMap[backendName];
            d1.run(function () {
                tierObj.seqId = process.domain.seqId
            })
            tierObj.executionTime = totalExecTime;
            tierObj.backendType = 1;

            var seqPfx = AgentSetting.flowMap[requestedObj.flowPathId].seqPfx;

            if (AgentSetting.flowMap[requestedObj.flowPathId].tlFirstTierFPID == undefined)
                CavNDFPInstance = current_fpid + "_" + seqPfx + "." + tierObj.seqId;
            else
                CavNDFPInstance = AgentSetting.flowMap[requestedObj.flowPathId].tlFirstTierFPID + "_" + current_fpid + "_" + seqPfx + "." + tierObj.seqId;

            util.logger.info(AgentSetting.currentTestRun+" | Dumping CavNDFPInstance : " + CavNDFPInstance + " for : " + requestedObj.flowPathId);
            opts.headers = {'CavNDFPInstance': CavNDFPInstance};

            var Callback = proxy.callback(args, -1, function (obj, args) {
                if (tierObj) {
                    if (!time.done()) return;
                }
            });

            if (tierObj && !Callback) {
                if (tierObj.executionTime) {
                    util.logger.info(AgentSetting.currentTestRun+" | Dumping T_Object for "+backendName+" at entry.");
                    flowpathId.calls.push(tierObj);
                    //backendRecord.handleBackendRecord(obj ,parseInt(tierObj.executionTime), backendName);
                }
            }


            proxy.callback(args, -1, function (obj, args) {

                var res = args[0];
                proxy.before(res, ['on', 'addListener'], function (obj, args) {

                    if (args[0] !== 'end') return;

                    proxy.callback(args, -1, function (obj, args) {


                        var time = opts.__time__;
                        if (!time || !time.done()) return;

                        try {
                           /* var obj = {
                                'Type': 'HTTP',
                                'Method': opts.method,
                                //'URL': (opts.hostname || opts.host) + (opts.port ? ':' + opts.port : '') + (opts.path || '/'),
                                'URL': (opts.hostname || opts.host) + (opts.port ? ':' + opts.port : '') + ('/'),
                                'Request headers': opts.headers,
                                'Response headers': res.headers,
                                'Stack trace': trace,
                            };*/

                            tierObj.executionTime = time.ms;
                            util.logger.info(AgentSetting.currentTestRun+" | Creating T_Object for Pg with Actual time .");

                            backendRecord.handleBackendRecord(obj, parseInt(tierObj.executionTime), backendName);

                            d1.seqId = 0;

                        } catch (err) {
                            util.logger.warn(AgentSetting.currentTestRun+" | Error in creating Backend : " + err);
                        }
                    });
                });
            });
        }
        catch(err){util.logger.warn(AgentSetting.currentTestRun+" | "+err)}
    });
};



