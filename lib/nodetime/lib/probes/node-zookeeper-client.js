
var proxy = require('../proxy');
var samples = require('../samples');
var backendRecord = require ('../../../backend/backendRecord.js');
var tierCall = require("../../../flowpath/tierCall").tierCall;
var ndMetaData = require('../../../metaData/ndMethodMetaData');
var AgentSetting = require("../../../agent-setting");
var ndSQLProcessor = require('../../../flowpath/ndSQLProcessor');
var ndSQLMetaData = require('../../../metaData/ndSQLMetaData');
var util = require('../../../util');

var asSettingObj = require('../../../autoSensor/autoSensorSetting');
var asManagerFile = require('../../../autoSensor/autoSensorManager');

var queryStartTimeSec ;
var startTime;

var commands = [
    "connect",
    "close",
    "create",
    "remove",
    "exists",
    "getChildren",
    "getData",
    "setData",
    "getACL",
    "setACL",
    "transaction",
    "mkdirp",
    "addAuthInfo",
    "getState",
    "getSessionId",
    "getSessionPassword",
    "once"
];

function wrapNodule(obj,methods){
    if(!Array.isArray(methods))methods=[methods]
    var ns = require('../../../utils/continuation-local-storage').getNamespace('cavissonNamespace');
    methods.forEach(function(method){
        var original = obj[method]
        if(!original) return;
        obj[method]= function(){
            var args = arguments;
            var last = args[args.length -1]
            if(typeof last== 'function')
            {
                if(ns)
                    args[args.length - 1] = ns.bind(last);
            }
            return original.apply(this, args);
        }
    })
}


module.exports = function(obj) {
    proxy.after(obj, 'createClient', function(obj, args, ret) {
        try {
            var CavNDFPInstance = "";
            var client = ret;
            wrapNodule(
                ret,
                commands
            )
            var opts = args[0];
            commands.forEach(function (command) {
                proxy.before(ret, command, function (obj, args) {
                    var backendName,requestedObj,zookeeperObj,time,queryStartTimeInMillis,commandName,flowpathObj,fpId;
                    if (asSettingObj.asSampleInterval > 0)
                        var trace = samples.stackTrace();
		            time = samples.time("Zookeeper", command);
		    backendName = backendRecord.generateBackendName('Zookeeper',client.connectionManager.servers[0].host,client.connectionManager.servers[0].port);
                    if(!backendName){
                        util.logger.info("BackendName for Zookeper is : ",backendName,"So returning")
                        return;
                    }
                    requestedObj=AgentSetting.getFlowPathIdFromRequest();
                    if(requestedObj) {
                        zookeeperObj = new tierCall()
                        queryStartTimeSec = ((time.begin - AgentSetting.cavEpochDiffInMills ) - requestedObj.cavTimeInMillis) / 1000;
                        queryStartTimeInMillis = (queryStartTimeSec) * 1000;


                        //var backendName = obj.VENDOR + '_' + obj.Connection.host + '_' + obj.Connection.port;

                        zookeeperObj.seqId = AgentSetting.seqId = AgentSetting.seqId + 1;
                        var opt = {};

                        for (i in args) {
                            if (typeof args[i] === 'function')
                                continue
                            opt[i] = args[i]
                        }
                        commandName = command + JSON.stringify(opt);
                        flowpathObj = AgentSetting.flowMap[requestedObj.cavFlowPathId];
                        fpId = requestedObj.cavFlowPathId;
                        if (!fpId)
                            return;

                        if (fpId.indexOf(":") == -1)                 //Getting only current fpid, not with parent id .
                            fpId = fpId;
                        else
                            fpId = fpId.split(":")[0];

                        var ht = process.hrtime();
                        totalExecTime = ((ht[0] * 1000000 + Math.round(ht[1] / 1000)) - time._begin) / 1000;

                        //Creating "T" Object that contain all data  required to create T_record

                        zookeeperObj.methodId = ndMetaData.backendMeta(backendName)
                        zookeeperObj.backendType = 1;
                        zookeeperObj.queryStartTimeSec = parseInt(queryStartTimeSec);
                        zookeeperObj.subType = ndSQLMetaData.setNonPrepared(commandName, fpId);      //dumping 23 meta record
                        zookeeperObj.executionTime = totalExecTime;
                        var seqPfx = flowpathObj.seqPfx;
                        if (AgentSetting.enableBackendMonTrace > 0)
                            util.logger.info(AgentSetting.currentTestRun, ' | Zookeeper Object: ', zookeeperObj, ' FlowpathID : ', fpId);
                        //------------
                        /*Appending Forced Fp Chain's 'F', so that next tier's current request would be treated as full flowpath request.*/
                        if (AgentSetting.enableForcedFPChain > 1) {
                            if (flowpathObj.tlFirstTierFPID && flowpathObj.tlFirstTierFPID.indexOf('F') == -1)
                                flowpathObj.tlFirstTierFPID += 'F';
                        }
                        else {
                            if (flowpathObj.tlFirstTierFPID && flowpathObj.tlFirstTierFPID.indexOf('F') == -1)
                                flowpathObj.tlFirstTierFPID += 'f';
                        }
                        if (!flowpathObj.tlFirstTierFPID)
                            CavNDFPInstance = fpId + "_" + seqPfx + "." + zookeeperObj.seqId;
                        else
                            CavNDFPInstance = flowpathObj.tlFirstTierFPID + "_" + fpId + "_" + seqPfx + "." + zookeeperObj.seqId;
                        if (!opts.headers)
                            opts.headers = {CavNDFPInstance: CavNDFPInstance};
                        else
                            opts.headers['CavNDFPInstance'] = CavNDFPInstance;
                        flowpathObj.calls.push(zookeeperObj);
                    }
                    var Callback = proxy.callback(args, -1, function (obj, args) {
                        if (!time.done()) return;
                        var res = args[0],statusCode=200;
                        if (res && res.statusCode)
                            statusCode = res.statusCode
                        var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;
                        if(flowpathObj) {
                            if (statusCode >=400)
                                zookeeperObj.status = 1;

                            zookeeperObj.statusCode = statusCode;
                            flowpathObj.errorStatusCode = statusCode;

                            zookeeperObj.executionTime = time.ms;
                            // var status = '200'
                            takeHotspotData(parseInt(zookeeperObj.executionTime), (+queryStartTimeInMillis + +requestedObj.cavTimeInMillis), fpId, trace);
                        }
                        if (AgentSetting.enableBackendMonTrace > 0)
                            util.logger.info(AgentSetting.currentTestRun, ' | Zookeeper Object: ', zookeeperObj);
                        backendRecord.handleBackendRecord(statusCode, parseInt(time.ms), backendName);

                    });
                    if(!Callback) {
                        if (time.done()) {
                            if(flowpathObj) {
                                zookeeperObj.executionTime = time.ms;
                                var status = '200'
                                takeHotspotData(parseInt(zookeeperObj.executionTime), (+queryStartTimeInMillis + +requestedObj.cavTimeInMillis), fpId, trace);
                            }
                            if (AgentSetting.enableBackendMonTrace > 0)
                                util.logger.info(AgentSetting.currentTestRun,' | Zookeeper Object: ',zookeeperObj);
                            backendRecord.handleBackendRecord(status, parseInt(time.ms), backendName);
                        }
                    }
                });
            });
        }
        catch(err){util.logger.warn(AgentSetting.currentTestRun+" | "+err)}

    });
};


function takeHotspotData (endTime,startTime,flowpathId,stackTrace) {
    try {
        //var stackTrace = asManagerFile.stackTrace();  //Getting Stack Trace for particular method.
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
