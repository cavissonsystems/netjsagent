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

 /* This file is changed by Harendra on dated : 12/4/2018
 * Purpose to change : Two Tier call out was happening when call type is https, reason : because in case of https call this file
 * internally called the http.js file that's why two http call was creating two T Records.
 */


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
var queryStartTimeMills;

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

    // client probe
    proxy.around(obj, 'request',
        function(obj, args, locals) {
            try{
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
                    'port' :(opts.port ? opts.port : '80'),
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
                    if(!flowpathObj) return;
                    timeInMillis =locals.timeInMillis= requestContext.cavTimeInMillis;
                    tierObj.queryStartTimeMills = queryStartTimeMills = parseInt((time.begin - agentSetting.cavEpochDiffInMills ) - timeInMillis);
                    startTime =locals.startTime= parseInt(queryStartTimeMills)

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
                var hasCallback = proxy.callback(args, -1,
                    function (obj, args ,callbackLocal) {
                        try{
                            var res = locals.res = args[0];
                            // if (res.statusCode >=400) {
                            if(flowpathObj && tierObj) {
                                callbackLocal.tierObj = tierObj
                                if (res.statusCode >=400)
                                    tierObj.status = 1;
                                tierObj.statusCode = res.statusCode;
                                flowpathObj.errorStatusCode = res.statusCode;
                            }
                            //}
                            proxy.before(res, ['on', 'once','addListener'],
                                function (obj, args) {
                                    try{
                                        if (args[0] !== 'end') return;
                                        proxy.callback(args, -1, function (obj, args) {

                                            var time = opts.__time__;
                                            if (!time || !time.done()) return;

                                            if(flowpathObj && tierObj) {
                                                tierObj.executionTime = time.ms;
                                                takeHotspotData(tierObj.executionTime, (+startTime + +timeInMillis), flowPathId, stackTrace);
                                            }
                                            processResHeaderForNetDelay(res,tierObj)
                                            backendRecord.handleBackendRecord(res.statusCode, parseInt(time.ms), backendName,tierObj);
                                            if(agentSetting.enableBackendMonTrace > 0) {
                                                util.logger.info(agentSetting.currentTestRun, ' | Creating Backend Record for ' + backendName, 'Time & Status : ', parseInt(time.ms), ' | ', res.statusCode);
                                            }
                                        });
                                    }catch(e){
                                        util.logger.warn('Error in Http Module :',e);
                                    }
                                });
                        }catch (e){
                            util.logger.warn('Error in Http Module :',e);
                        }
                    },
                    function(obj, args, ret) {
                        try{
                            if (locals.res && locals.res.listenerCount && locals.res.listenerCount('end') === 1) {
                                if (time.done()) {
                                    var status = '200'
                                    status = locals.res.statusCode ;
                                    if(flowpathObj && tierObj) {
                                        tierObj.executionTime = time.ms;
                                        takeHotspotData(tierObj.executionTime, (+startTime + +timeInMillis), flowPathId, stackTrace);
                                    }
                                    processResHeaderForNetDelay(locals.res,tierObj)
                                    backendRecord.handleBackendRecord(status, parseInt(time.ms), backendName,tierObj);
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
                        }catch(e){
                            util.logger.warn('Error in Http Module :',e);
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
            }catch(e){util.logger.warn('Error in Http Module :',e)
            }
        },
        function(obj, args, ret,locals) {
            try{
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
                        proxy.callback(args, -1,
                            function(obj, args) {
                                try{
                                    if(!time.done()) return;

                                    locals.res = args[0];
                                    if(flowPathId && tierObj) {
                                        tierObj.executionTime = time.ms;
                                        tierObj.statusCode = locals.res ? locals.res.statusCode : 0;
                                        takeHotspotData(tierObj.executionTime, (+startTime + +timeInMillis), flowPathId, stackTrace);
                                    }
                                    var status = '200'
                                    if(locals.res)
                                        status = locals.res.statusCode ;
                                    if(backendName) {
                                        processResHeaderForNetDelay(locals.res,tierObj)
                                        backendRecord.handleBackendRecord(status, parseInt(time.ms), backendName,tierObj);
                                        if (agentSetting.enableBackendMonTrace > 0)
                                            util.logger.info('Creating Backend Record for ' + backendName, 'Time & Status : ', parseInt(time.ms), ' | ', status);
                                    }
                                }catch(e){
                                    util.logger.warn('Error in Http Module :',e)
                                }
                            });
                    }
                    else if (args[0] == 'error') {
                        proxy.callback(args, -1,
                            function (obj, args) {
                                try{
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
                                        backendRecord.handleBackendRecord(status, parseInt(time.ms), backendName,tierObj);
                                        if (agentSetting.enableBackendMonTrace > 0)
                                            util.logger.info('Creating Backend Record for ' + backendName, 'Time & Status : ', parseInt(time.ms), ' | ', status);
                                    }
                                }catch(e){
                                    util.logger.warn('Error in Http Module :',e)
                                }
                            });
                    }
                });
            }catch(e){
                util.logger.warn('Error in Http Module :',e)
            }
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

            if(tierObj && res && res['headers'] != null){
                var reqDelay = parseInt(res['headers']['x-cavisson-request-net-delay'])
                var resDelay = parseInt(res['headers']['x-cavisson-response-net-delay'])

                if(!isNaN(reqDelay)){
                    if(agentSetting.enableBciDebug > 4)
                        util.logger.warn('x-cavisson-request-net-delay Arrived :',reqDelay,typeof reqDelay)
                    tierObj.networkDelayInRequest = reqDelay;
                }else{
                    tierObj.networkDelayInRequest = 0;
                }

                if(!isNaN(resDelay)){
                    var resArrival = (new Date().getTime() - agentSetting.cavEpochDiffInMills)
                    if(agentSetting.enableBciDebug > 4)
                        util.logger.warn('x-cavisson-response-net-delay Arrived : ',resDelay ,' response Arrival time : ',resArrival,' , Delay :',resArrival - resDelay,typeof resDelay,typeof resArrival)
                    if(resArrival >= resDelay){
                        tierObj.networkDelayInResponse = resArrival - resDelay;
                    }else{
                        tierObj.networkDelayInResponse = 0;
                    }
                }else{
                    tierObj.networkDelayInResponse = 0;
                }
            }else{
                if(agentSetting.enableBciDebug > 4)
                    util.logger.warn(' Warning  No X-CAVISSON-NET-DELAY header received for Request ')
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




