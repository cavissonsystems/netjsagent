var flowpathHandler = require("../../../flowpath-handler");
var methodManager = require("../../../methodManager");
var tierCall = require("../../../flowpath/tierCall").tierCall;
var backendRecord = require('../../../backend/backendRecord');
var util = require('../../../util');
var agentSetting = require("../../../agent-setting");
var domain = require('domain');
var ndMetaData = require('../../../metaData/ndMethodMetaData');



var nt = require('../nodetime');
var proxy = require('../proxy');
var samples = require('../samples');
var ThreadLocalSeqNumber = 0;
var http = new Object ();
var queryStartTimeSec;

module.exports = function(obj) {
    // server probe
    proxy.before(obj.Server.prototype, ['on', 'addListener'], function(obj, args) {
        try {

            if (args[0] !== 'request') return;

            proxy.callback4flowpath(args, -1, function (obj, args) {

                var req = args[0];
                var res = args[1];

                if ('100' == agentSetting.bciInstrSessionPct) {
                    req.cavIncludeFp = true;
                } else {
                    var curRandomNumber = 1 + parseInt(Math.random() * 100);
                    if (curRandomNumber <= agentSetting.bciInstrSessionPct) {
                        req.cavIncludeFp = true;
                    } else {
                        req.cavIncludeFp = false;
                    }
                }
                flowpathHandler.handleFlowPath(req, res, args);               //    Going to generate Flowpath
                proxy.after(res, 'end', function (obj, args) {
                    methodManager.onCompleteFlowPath(req, res);
                    if (!time.done()) return;

                });
            });
        }catch(err){
            util.logger.warn(agentSetting.currentTestRun+" | "+err);
        }
    });


    // client probe
    proxy.around(obj, 'request', function(obj, args, locals) {
        try {
            var flowPathObj = agentSetting.getFlowPathIdFromRequest();

            if(!flowPathObj)
                return;

            var flowPathId = flowPathObj.flowPathId;
            var timeInMillis = flowPathObj.timeInMillis;

           if(flowPathId===undefined){
               return;
           }

            var opts = args[0];
            var time = opts.__time__ = samples.time('HTTP Client', 'GET');
            queryStartTimeSec = parseInt(((time.begin - agentSetting.cavEpochDiffInMills ) - timeInMillis) / 1000);
            var tierObj = new tierCall();
            tierObj.queryStartTimeSec = queryStartTimeSec;
            locals.tierCall=tierObj;


            var CavNDFPInstance = "";
            var current_fpid = flowPathId;

            if (flowPathId.indexOf(":") == -1)
                flowPathId = flowPathId;
            else {
                var id = flowPathId.split(":");
                flowPathId = id[0];
            }

            var object = {
                'URL': (opts.hostname || opts.host) + (opts.port ? ':' + opts.port : '') + ('/'),
                'VENDOR': 'HTTP'
            };

            var backendName =  locals.backendName = object.VENDOR + '_' + object.URL;

            tierObj.seqId =agentSetting.seqId = agentSetting.seqId + 1;
            /*var d1 = domain.create();
            d1.seqId = agentSetting.seqId;
*/
            var flowpath = agentSetting.flowMap[flowPathId];

            var ht = process.hrtime();
            totalExecTime = ((ht[0] * 1000000 + Math.round(ht[1] / 1000)) - time._begin) / 1000;

            //util.logger.info(agentSetting.currentTestRun+" | Creating Backend meta record for : " + backendName);

            tierObj.methodId = ndMetaData.backendMeta(backendName);			//Dumping 5 Record

            /*d1.run(function () {
                tierObj.seqId = process.domain.seqId
            })*/

            tierObj.executionTime = totalExecTime;
            tierObj.backendType = 1;

            var seqPfx = flowpath.seqPfx;

            if (flowpath.tlFirstTierFPID == undefined)
                CavNDFPInstance = flowPathId + "_" + seqPfx + "." + tierObj.seqId;
            else
                CavNDFPInstance = flowpath.tlFirstTierFPID + "_" + flowPathId + "_" + seqPfx + "." + tierObj.seqId;

           // util.logger.info(agentSetting.currentTestRun+" | Dumping CavNDFPInstance : " + CavNDFPInstance + " for : " + requestedObj.flowPathId);
            opts.headers = {'CavNDFPInstance': CavNDFPInstance};
            flowpath.calls.push(tierObj);

            /*try {

                var Callback = proxy.callback(args, -1, function (obj, args) {
                    if (tierObj) {
                        if (!time.done()) return;
                    }
                });
            }catch(err){
                console.log(err);
            }*/

            /*if (tierObj && !Callback) {
                if (tierObj.executionTime) {
                   // util.logger.info(agentSetting.currentTestRun+" | Dumping T_Object for "+backendName+" at entry.");
                 //   flowpath.calls.push(tierObj);
                    //backendRecord.handleBackendRecord(obj ,parseInt(tierObj.executionTime), backendName);
                }
            }*/

            proxy.callback(args, -1, function (obj, args) {

                var res = args[0];
                if (res.statusCode == undefined && res.statusCode >=400) {
                    tierObj.status = 1;
                    tierObj.code = res.statusCode;
                }
                proxy.before(res, ['on', 'addListener'], function (obj, args) {
                    try {

                        if (args[0] !== 'end') return;

                        proxy.callback(args, -1, function (obj, args) {


                            var time = opts.__time__;
                            if (!time || !time.done()) return;

                            try {

                                tierObj.executionTime = time.ms;
                                //   util.logger.info(agentSetting.currentTestRun+" | Creating T_Object for Pg with Actual time .");

                                backendRecord.handleBackendRecord(res.statusCode, parseInt(tierObj.executionTime), backendName);

                            } catch (err) {
                                util.logger.warn(agentSetting.currentTestRun + " | Error in creating Backend : " + err);
                            }
                        });
                    }catch(err){
                        util.logger.warn(agentSetting.currentTestRun+" | "+err);
                    }
                });

            });
        }catch(err){util.logger.warn(agentSetting.currentTestRun+" | "+err)}
    },
        function(obj, args, ret,locals) {
            try {
                var tierObj = locals.tierCall;
                //var flowpath = locals.flowpath;
                var time = undefined;
                var trace = samples.stackTrace();
                var opts = args[0];
                var backendName=locals.backendName;

                proxy.before(ret, 'end', function (obj, args) {


                    time = opts.__time__ = !opts.__time__ ? samples.time("HTTP Client", opts.method || 'GET') : opts.__time__;
                });

                try {
                    proxy.before(ret, ['on', 'addListener'], function (obj, args) {
                        if (args[0] !== 'error') return;

                        try {
                            proxy.callback(args, -1, function (obj, args) {
                                if (!time || !time.done()) return;

                                if (tierObj) {
                                    tierObj.status = 1;
                                    tierObj.code = args[0].code;        //todo check status code
                                    tierObj.code = '404';
                                }

                                try {

                                    tierObj.executionTime = time.ms;

                                    backendRecord.handleBackendRecord(tierObj.code, parseInt(tierObj.executionTime), backendName);

                                } catch (err) {
                                    util.logger.warn(agentSetting.currentTestRun + " | Error in creating Backend : " + err);
                                }

                               /* var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;
                                var obj = {
                                    'Type': 'HTTP',
                                    'Method': opts.method,
                                    'URL': (opts.hostname || opts.host) + (opts.port ? ':' + opts.port : '') + (opts.path || '/'),
                                    'Request headers': opts.headers,
                                    'Stack trace': trace,
                                    'Error': error
                                };*/
                            });
                        } catch (err) {
                            util.logger.warn(agentSetting.currentTestRun+" | "+err);
                        }
                    });
                } catch (err) {
                    util.logger.warn(agentSetting.currentTestRun+" | "+err);
                }
            } catch (err) {
                util.logger.warn(agentSetting.currentTestRun+" | "+err);
            }
        }
    );
};



