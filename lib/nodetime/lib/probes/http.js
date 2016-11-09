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
                    methodManager.onCompleteFlowPath(req, res,new Date().getTime());
                    return;

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

            var flowPathId =locals.flowPathId = flowPathObj.flowPathId;
            var timeInMillis = flowPathObj.timeInMillis;

           if(!flowPathId){
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

            opts.headers = {'CavNDFPInstance': CavNDFPInstance};
            flowpath.calls.push(tierObj);

            var hasCallback = proxy.callback(args, -1, function (obj, args) {
                    var res = locals.res = args[0];
                    if (res.statusCode == undefined && res.statusCode >=400) {
                        tierObj.status = 1;
                        tierObj.code = res.statusCode;
                    }
//                    util.logger.info(agentSetting.currentTestRun," | Invoking proxy.callback , args[0] is : ",args[0]," with fpid : ",flowPathId)
                    proxy.before(res, ['on', 'once','addListener'], function (obj, args) {
                        try {
  //                          util.logger.info(agentSetting.currentTestRun," | Invoking hasCallback hook befor , args[0] is : ",args[0]," with fpid : ",flowPathId)
                            if (args[0] !== 'end') return;

                            proxy.callback(args, -1, function (obj, args) {


                                var time = opts.__time__;
                                if (!time || !time.done()) return;

                                try {
                                    tierObj.executionTime = time.ms;
                                    backendRecord.handleBackendRecord(res.statusCode, parseInt(tierObj.executionTime), backendName);

                                } catch (err) {
                                    util.logger.warn(agentSetting.currentTestRun + " | Error in creating Backend : " + err);
                                }
                            });
                        }catch(err){
                            util.logger.warn(agentSetting.currentTestRun+" | "+err);
                        }
                    });


                },
                function(obj, args, ret) {
                    if (locals.res && locals.res.listenerCount && locals.res.listenerCount('end') === 1) {

                        if (time.done()) {
                            try {
                                tierObj.executionTime = time.ms;
                                var status = '200'
                                if(locals.res)
                                    status = locals.res.statusCode ;
                                backendRecord.handleBackendRecord(status, parseInt(tierObj.executionTime), backendName);

                            } catch (err) {
                                util.logger.warn(agentSetting.currentTestRun + " | Error in creating Backend : " + err);
                            }
                        }

                       /* console.log("End event is not present : ",locals.res.listenerCount('end'))
                        //locals.res.on('end', function() {});
                        var callbacks=[];
                        var fun=locals.res.listeners('end');

                        callbacks.push(locals.res.listeners('end')[0]);

                        var orig = (typeof callbacks[0] === 'function') ?  callbacks[0] : undefined;
                        console.log("argument type ", orig, "callbacks[0] ",
                            callbacks[0]," type def ",typeof callbacks[0]);
                        args[args.length-1]=locals.res.listeners('end')[0];

                        var obje=proxy.callback(args, -1, function (obj, args) {
                            console.log("Invoked default callback on response object")
                        });*/
                    }
            });

            /*if(!hasCallback)
            {
                if (time.done()) {

                    try {

                        tierObj.executionTime = time.ms;

                        var status = '200'
                        if(locals.res)
                            status = locals.res.statusCode ;

                        backendRecord.handleBackendRecord(status, parseInt(tierObj.executionTime), backendName);

                    } catch (err) {
                        util.logger.warn(agentSetting.currentTestRun + " | Error in creating Backend : " + err);
                    }
                }
            }*/
        }catch(err){util.logger.warn(agentSetting.currentTestRun+" | "+err)}
    },
        function(obj, args, ret,locals) {
            try {
                var tierObj = locals.tierCall;
                var flowPathId = locals.flowPathId
                var time = undefined;
                var trace = samples.stackTrace();
                var opts = args[0];
                var backendName=locals.backendName;

               // proxy.before(ret, 'end', function (obj, args) {
                    time = opts.__time__ = !opts.__time__ ? samples.time("HTTP Client", opts.method || 'GET') : opts.__time__;
                //});

                try {
                    proxy.before(ret, ['on', 'once','addListener'], function (obj, args) {

//                        util.logger.info(agentSetting.currentTestRun," | Invoking hookafter , args[0] is : ",args[0]," with fpid : ",flowPathId)
                        if(args[0] == 'response') {
                            proxy.callback(args, -1, function(obj, args) {
                                try {
                                    if(!tierObj) return;
                                    if(!time.done()) return;

                                    locals.res = args[0];
                                    tierObj.executionTime = time.ms;
                                    backendRecord.handleBackendRecord(tierObj.code, parseInt(tierObj.executionTime), backendName);
                                } catch (err) {
                                    util.logger.warn(agentSetting.currentTestRun + " | Error in creating Backend : " + err);
                                }
                            });
                        }
                        else if (args[0] == 'error') {
                            proxy.callback(args, -1, function (obj, args) {
                                try {
                                    if(!tierObj) return;

                                    if(!time.done()) return;

                                        if (locals.tierCall) {
                                            locals.tierCall.status = 1;
                                            locals.tierCall.code = args[0].code;        //todo check status code
                                            locals.tierCall.code = '404';
                                        }
                                    locals.tierCall.executionTime = time.ms;
                                    backendRecord.handleBackendRecord(locals.tierCall.code, parseInt(locals.tierCall.executionTime), backendName);
                                } catch (err) {
                                    util.logger.warn(agentSetting.currentTestRun + " | Error in creating Backend : " + err);
                                }

                            });
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



