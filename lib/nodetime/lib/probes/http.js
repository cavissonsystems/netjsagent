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
var serverMonitor = require('../../../nodeServerMonitor/serverMonitor');
var entryPointManager = require('../../../utils/NDEntryPointManager');

var proxy = require('../proxy');
var samples = require('../samples');
var ThreadLocalSeqNumber = 0;
var http = new Object ();
var queryStartTimeSec;

module.exports = function(obj) {
    // server probe
    proxy.after(obj.Server.prototype, 'listen', function(obj, args,ret) {
        serverMonitor.addMonitor(ret)
    })
    proxy.before(obj.Server.prototype, ['on', 'addListener'], function(obj, args) {
        if (args[0] !== 'request') return;
        proxy.callback4flowpath(args, -1, function (obj, args,local,context) {
            if(entryPointManager.isEntryPointConfigured == 0)return;
            local.args = args;//{}
            local.methodName = cwd+'._http_server.HTTPParser_parserOnIncoming'
            local.isFirstOrlastMethod = true;

            var req = args[0];
            var res = args[1];
            var ext = req['url'].split(".").pop();          //it will give the last value after splitting <Extension of url file>
            if(ext == 'css' || ext == 'png' || ext == 'js' ||ext == 'jpeg' ||ext == 'ico'||ext == 'svg' || !agentSetting.isToInstrument) {
                return;
            }

            processReqHeaderForNetDelay(req,res);
            if(agentSetting.nodeServerMonitor >0) serverMonitor.monitorRequest(req,res,obj,context)
            flowpathHandler.handleFlowPath(req,res,context);               //    Going to generate Flowpath
            proxy.around(res, 'end', function(obj, args,local){
                local.args = args;//{}
                local.methodName = cwd+'._http_outgoing.OutgoingMessage_end'
                local.isFirstOrlastMethod = true;
                methodManager.onEntry(local)
            },function (obj, args,ret,local) {
                if(entryPointManager.isEntryPointConfigured == 0)return;

                methodManager.onExit(local)
                methodManager.onCompleteFlowPath(req, res,context);
                return;

            });

            methodManager.onEntry(local)
        },function(obj,args,ret,local){
            methodManager.onExit(local)
        });
    });

    proxy.before(obj.ServerResponse.prototype, ['writeHead'], function(obj,args){

        if(agentSetting.enableCaptureNetDelay == 1 &&  obj.constructor.name == 'ServerResponse'  && !obj._headerSent ){
            responseStart = (new Date().getTime() - agentSetting.cavEpochDiffInMills);
            if(agentSetting.enableBciDebug > 4)
                util.logger.warn('Setting the X-CAVISSON-RESPONSE-NET-DELAY Header : ',responseStart)
            obj.setHeader('X-CAVISSON-RESPONSE-NET-DELAY' , responseStart);
        }
    })

    // client probe
    proxy.around(obj, 'request', function(obj, args, locals) {
            if(!agentSetting.isToInstrument)return;
            if(entryPointManager.isHttpExitPointConfigured ==0)return;
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
                flowPathId =locals.flowPathId = requestContext.cavFlowPathId;
                if(!flowPathId) return;
                locals.tierCall = tierObj = new tierCall();
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

                tierObj.seqId = ++requestContext.seqId ;
                var ht = process.hrtime();
                totalExecTime = ((ht[0] * 1000000 + Math.round(ht[1] / 1000)) - time._begin) / 1000;
                tierObj.methodId = methodId
                tierObj.executionTime = totalExecTime;
                tierObj.backendType = 1;
                var seqPfx = flowpathObj.seqPfx;

                if(agentSetting.enableCaptureNetDelay == 1){
                    var reqTime = new Date().getTime() - agentSetting.cavEpochDiffInMills;
                    if (!flowpathObj.tlFirstTierFPID)
                        CavNDFPInstance = flowPathId + "_" + seqPfx + "." + tierObj.seqId + '#' + reqTime ;
                    else
                        CavNDFPInstance = flowpathObj.tlFirstTierFPID + "_" + flowPathId + "_" + seqPfx + "." + tierObj.seqId + '#' + reqTime ;
                }else{
                    if (!flowpathObj.tlFirstTierFPID)
                        CavNDFPInstance = flowPathId + "_" + seqPfx + "." + tierObj.seqId;
                    else
                        CavNDFPInstance = flowpathObj.tlFirstTierFPID + "_" + flowPathId + "_" + seqPfx + "." + tierObj.seqId;
                }

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
                    proxy.before(res, ['on', 'once','addListener'],
                        function (obj, args) {
                            if (args[0] !== 'end') return;
                            proxy.callback(args, -1, function (obj, args) {

                                var time = opts.__time__;
                                if (!time || !time.done()) return;

                                if(flowpathObj) {
                                    tierObj.executionTime = time.ms;
                                    takeHotspotData(tierObj.executionTime, (+startTime + +timeInMillis), flowPathId, stackTrace);
                                }
                                processResHeaderForNetDelay(res,tierObj)
                                backendRecord.handleBackendRecord(res.statusCode, parseInt(time.ms), backendName,tierObj.networkDelayInRequest,tierObj.networkDelayInResponse);
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
                            processResHeaderForNetDelay(locals.res,tierObj)
                            backendRecord.handleBackendRecord(status, parseInt(time.ms), backendName,tierObj.networkDelayInRequest,tierObj.networkDelayInResponse);
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
            if(!agentSetting.isToInstrument)return;
            if(entryPointManager.isHttpExitPointConfigured ==0)return;
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
                        if(flowPathId && tierObj) {
                            tierObj.executionTime = time.ms;
                            takeHotspotData(tierObj.executionTime, (+startTime + +timeInMillis), flowPathId, stackTrace);
                        }
                        var status = '200'
                        if(locals.res)
                            status = locals.res.statusCode ;
                        if(backendName) {
                            processResHeaderForNetDelay(locals.res,tierObj)
                            backendRecord.handleBackendRecord(status, parseInt(time.ms), backendName,tierObj.networkDelayInRequest,tierObj.networkDelayInResponse);
                            if (agentSetting.enableBackendMonTrace > 0)
                                util.logger.info('Creating Backend Record for ' + backendName, 'Time & Status : ', parseInt(time.ms), ' | ', status);
                        }
                    });
                }
                else if (args[0] == 'error') {
                    proxy.callback(args, -1, function (obj, args) {
                        if(!time.done()) return;
                        if (locals.flowPathId && locals.tierCall) {
                            locals.tierCall.status = 1;
                            locals.tierCall.statusCode = args[0].code;        //todo check status code
                            locals.tierCall.statusCode = '404';

                            locals.tierCall.executionTime = time.ms;
                            takeHotspotData(tierObj.executionTime,(+startTime + +timeInMillis),flowPathId,stackTrace);
                        }
                        var status = '200'
                        if(locals.res)
                            status = locals.res.statusCode ;

                        if(backendName) {
                            processResHeaderForNetDelay(locals.res,tierObj)
                            backendRecord.handleBackendRecord(status, parseInt(time.ms), backendName,tierObj.networkDelayInRequest,tierObj.networkDelayInResponse);
                            if (agentSetting.enableBackendMonTrace > 0)
                                util.logger.info('Creating Backend Record for ' + backendName, 'Time & Status : ', parseInt(time.ms), ' | ', status);
                        }
                    });
                }
            });
        }
    );
};

function processReqHeaderForNetDelay(req,res) {

    try{
        if(agentSetting.enableCaptureNetDelay == 1){
            var nsFlowpathInstanceID = req.headers['cavndfpinstance'],
                reqStartTime;
            if(!nsFlowpathInstanceID)
                return;

            var arrivalTime = new Date().getTime() - agentSetting.cavEpochDiffInMills;

            if(nsFlowpathInstanceID.indexOf('#') > -1 && typeof nsFlowpathInstanceID == 'string' ){
                reqStartTime = nsFlowpathInstanceID.substring(nsFlowpathInstanceID.lastIndexOf('#')+1);

                if(!isNaN(parseInt(reqStartTime)) && arrivalTime >= reqStartTime){
                    res.setHeader('X-CAVISSON-REQUEST-NET-DELAY', arrivalTime-reqStartTime);
                }else{
                    if(agentSetting.enableBciDebug > 4)
                        util.logger.warn('Error During Setting the X-CAVISSON-REQUEST-NET-DELAY',!isNaN(parseInt(reqStartTime)),arrivalTime >= reqStartTime)
                }
            }
        }
    }catch(e){
        console.log('Error:',e)
    }
}

function processResHeaderForNetDelay(res,tierObj) {

    try{
        if( agentSetting.enableCaptureNetDelay == 1) {

         //   console.log('\n\n\n\nresponse ......',res,'\n\n\n\n')
            if(res && res['headers'] != null){
                var reqDelay = res['headers']['x-cavisson-request-net-delay']
                var resDelay = res['headers']['x-cavisson-response-net-delay']

                if(!isNaN(parseInt(reqDelay))){
                    tierObj.networkDelayInRequest = reqDelay;
                }else{
                    tierObj.networkDelayInRequest = 0;
                }

                if(!isNaN(parseInt(resDelay))){
                    var resArrival = (new Date().getTime() - agentSetting.cavEpochDiffInMills)
                    if(resArrival >= resDelay){
                        tierObj.networkDelayInResponse = resArrival - resDelay;
                    }
                }else{
                    tierObj.networkDelayInResponse = 0;
                }
            }else{
                tierObj.networkDelayInRequest = 0;
                tierObj.networkDelayInResponse = 0;
            }
        }
    }catch(e){
        console.log('Error : ',e)
    }
}

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
