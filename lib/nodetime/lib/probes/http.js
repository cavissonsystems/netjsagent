var flowpathHandler = require("../../../flowpath-handler");
var methodManager = require("../../../methodManager");
var tierCall = require("../../../flowpath/tierCall").tierCall;
var backendRecord = require('../../../backend/backendRecord');
var util = require('../../../util');
var agentSetting = require("../../../agent-setting");
var ndMetaData = require('../../../metaData/ndMethodMetaData');
var path = require('path'),
    cwd =  process.cwd().substring(process.cwd().lastIndexOf(path.sep)+1,process.cwd().length);

var asSettingObj = require('../../../autoSensor/autoSensorSetting');
var asManagerFile = require('../../../autoSensor/autoSensorManager');


var proxy = require('../proxy');
var samples = require('../samples');
var ThreadLocalSeqNumber = 0;
var http = new Object ();
var queryStartTimeSec;

module.exports = function(obj) {
    // server probe
    proxy.before(obj.Server.prototype, ['on', 'addListener'], function(obj, args) {
        if (args[0] !== 'request') return;

        proxy.callback4flowpath(args, -1, function (obj, args,local,context) {
            local.args = args;//{}
            local.methodName = cwd+'._http_server.HTTPParser_parserOnIncoming'
            local.isFirstOrlastMethod = true;

            var req = args[0];
            var res = args[1];

            if ('100' == agentSetting.bciInstrSessionPct) {
                context.cavIncludeFp = true;
            } else {
                var curRandomNumber = 1 + parseInt(Math.random() * 100);
                if (curRandomNumber <= agentSetting.bciInstrSessionPct) {
                    context.cavIncludeFp = true;
                } else {
                    context.cavIncludeFp = false;
                }
            }
            flowpathHandler.handleFlowPath(req, context);               //    Going to generate Flowpath
            proxy.around(res, 'end', function(obj, args,local){
                local.args = args;//{}
                local.methodName = cwd+'._http_outgoing.OutgoingMessage_end'
                local.isFirstOrlastMethod = true;
                methodManager.onEntry(local)

            },function (obj, args,ret,local) {
                methodManager.onExit(local)
                methodManager.onCompleteFlowPath(req, res,context);
                return;

            });
            methodManager.onEntry(local)
        },function(obj,args,ret,local){
            methodManager.onExit(local)
        });
    });

    // client probe
    proxy.around(obj, 'request', function(obj, args, locals) {
            var stackTrace,flowPathId,timeInMillis,tierObj,startTime,CavNDFPInstance = "",flowpathObj
            if (asSettingObj.asSampleInterval > 0) {
                stackTrace = samples.stackTrace();
            }
            var opts = args[0];
            var time = opts.__time__ = samples.time('HTTP Client', 'GET');
            var object = {
                'host': (opts.hostname || opts.host),
                'port' :(opts.port ? opts.port : ''),
                'query':(opts.path ? opts.path.split('?')[1] : ''),
                'VENDOR': 'HTTP'
            };
            var backendName = locals.backendName = backendRecord.generateBackendName(object.VENDOR,object.host,object.port,object.query)
            if(!backendName){
                util.logger.info("BackendName is : ",backendName,"So returning")
                return;
            }
            var requestContext = agentSetting.getFlowPathIdFromRequest();
            var methodId = ndMetaData.backendMeta(backendName);
            if(requestContext){
                locals.tierCall = tierObj = new tierCall();
                flowPathId =locals.flowPathId = requestContext.cavFlowPathId;

                flowpathObj = agentSetting.flowMap[flowPathId];
                timeInMillis =locals.timeInMillis= requestContext.cavTimeInMillis;
                tierObj.queryStartTimeSec = queryStartTimeSec = parseInt(((time.begin - agentSetting.cavEpochDiffInMills ) - timeInMillis) / 1000);
                startTime =locals.startTime= parseInt(queryStartTimeSec * 1000)

                if (flowPathId.indexOf(":") == -1)
                    flowPathId = flowPathId;
                else {
                    var id = flowPathId.split(":");
                    flowPathId = id[0];
                }

                tierObj.seqId =agentSetting.seqId = agentSetting.seqId + 1;
                var ht = process.hrtime();
                totalExecTime = ((ht[0] * 1000000 + Math.round(ht[1] / 1000)) - time._begin) / 1000;
                tierObj.methodId = methodId
                tierObj.executionTime = totalExecTime;
                tierObj.backendType = 1;
                var seqPfx = flowpathObj.seqPfx;

                /*Appending Forced Fp Chain's 'F', so that next tier's current request would be treated as full flowpath request.*/
                if(agentSetting.enableForcedFPChain > 1) {
                    if (flowpathObj.tlFirstTierFPID && flowpathObj.tlFirstTierFPID.indexOf('F') == -1)
                        flowpathObj.tlFirstTierFPID += 'F';
                }
                else{
                    if(flowpathObj.tlFirstTierFPID && flowpathObj.tlFirstTierFPID.indexOf('F') == -1)
                        flowpathObj.tlFirstTierFPID += 'f';
                }
                if (!flowpathObj.tlFirstTierFPID)
                    CavNDFPInstance = flowPathId + "_" + seqPfx + "." + tierObj.seqId;
                else
                    CavNDFPInstance = flowpathObj.tlFirstTierFPID + "_" + flowPathId + "_" + seqPfx + "." + tierObj.seqId;
                if(!opts.headers)
                    opts.headers = {CavNDFPInstance : CavNDFPInstance};
                else
                    opts.headers['CavNDFPInstance'] = CavNDFPInstance;
                flowpathObj.calls.push(tierObj);

            }
            var hasCallback = proxy.callback(args, -1, function (obj, args) {
                    var res = locals.res = args[0];
                    if (res.statusCode >=400) {
                        if(flowpathObj) {
                            tierObj.status = 1;
                            tierObj.statusCode = res.statusCode;
                            flowpathObj.errorStatusCode = res.statusCode;
                        }
                    }
                    proxy.before(res, ['on', 'once','addListener'], function (obj, args) {
                        if (args[0] !== 'end') return;
                        proxy.callback(args, -1, function (obj, args) {

                            var time = opts.__time__;
                            if (!time || !time.done()) return;

                            if(flowpathObj) {
                                tierObj.executionTime = time.ms;
                                takeHotspotData(tierObj.executionTime, (+startTime + +timeInMillis), flowPathId, stackTrace);
                            }
                            backendRecord.handleBackendRecord(res.statusCode, parseInt(time.ms), backendName);
                            if(agentSetting.enableBackendMonTrace > 0) {
                                util.logger.info(agentSetting.currentTestRun, ' | Creating Backend Record for ' + backendName, 'Time & Status : ', parseInt(time.ms), ' | ', res.statusCode);
                            }

                        });
                    });
                },
                function(obj, args, ret) {
                    if (locals.res && locals.res.listenerCount && locals.res.listenerCount('end') === 1) {
                        if (time.done()) {
                            var status = '200'
                            if(locals.res)
                                status = locals.res.statusCode ;
                            if(flowpathObj) {
                                tierObj.executionTime = time.ms;
                                takeHotspotData(tierObj.executionTime, (+startTime + +timeInMillis), flowPathId, stackTrace);
                            }
                            backendRecord.handleBackendRecord(status, parseInt(time.ms), backendName);
                            if(agentSetting.enableBackendMonTrace > 0) {
                                util.logger.info('Creating Backend Record for ' + backendName, 'Time & Status : ', parseInt(time.ms), ' | ', status);
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
        },
        function(obj, args, ret,locals) {
            var tierObj = locals.tierCall;
            var flowPathId = locals.flowPathId,
                timeInMillis = locals.timeInMillis,
                startTime = locals.startTime;
            var time = undefined;
            var stackTrace = samples.stackTrace();
            var opts = args[0];
            var backendName=locals.backendName;

            time = opts.__time__ = !opts.__time__ ? samples.time("HTTP Client", opts.method || 'GET') : opts.__time__;
            proxy.before(ret, ['on', 'once','addListener'], function (obj, args) {

//                        util.logger.info(agentSetting.currentTestRun," | Invoking hookafter , args[0] is : ",args[0]," with fpid : ",flowPathId)
                if(args[0] == 'response') {
                    proxy.callback(args, -1, function(obj, args) {
                        if(!time.done()) return;

                        locals.res = args[0];
                        if(tierObj) {
                            tierObj.executionTime = time.ms;
                            takeHotspotData(tierObj.executionTime, (+startTime + +timeInMillis), flowPathId, stackTrace);
                        }
                        var status = '200'
                        if(locals.res)
                            status = locals.res.statusCode ;
                        backendRecord.handleBackendRecord(status, parseInt(time.ms), backendName);
                        if(agentSetting.enableBackendMonTrace > 0) {
                            util.logger.info('Creating Backend Record for ' + backendName, 'Time & Status : ', parseInt(time.ms), ' | ', status);
                        }
                    });
                }
                else if (args[0] == 'error') {
                    proxy.callback(args, -1, function (obj, args) {
                        if(!time.done()) return;
                        if (locals.tierCall) {
                            locals.tierCall.status = 1;
                            locals.tierCall.statusCode = args[0].code;        //todo check status code
                            locals.tierCall.statusCode = '404';

                            locals.tierCall.executionTime = time.ms;
                            takeHotspotData(tierObj.executionTime,(+startTime + +timeInMillis),flowPathId,stackTrace);
                        }
                        var status = '200'
                        if(locals.res)
                            status = locals.res.statusCode ;
                        backendRecord.handleBackendRecord(status, parseInt(time.ms), backendName);
                        if(agentSetting.enableBackendMonTrace > 0)
                            util.logger.info('Creating Backend Record for '+ backendName,'Time & Status : ',parseInt(time.ms),' | ',status);

                    });
                }
            });
        }
    );
};


function takeHotspotData (endTime,startTime,flowPathId,stackTrace) {
    try {
    if (asSettingObj.asSampleInterval > 0) {
        if (endTime > asSettingObj.threshold) {
            //var stackTrace = asManagerFile.stackTrace();  //Getting Stack Trace for particular method.
            process.nextTick(function () {
                asManagerFile.handledHotspotData(stackTrace, endTime, startTime, flowPathId, "", process.pid, (new Date().getTime() - agentSetting.cavEpochDiffInMills));
            });
        }
    }
    }catch (err) {
        util.logger.warn("Getting Error in AS :-  " + err);
    }
}
