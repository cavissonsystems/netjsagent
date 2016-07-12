var flowpathHandler = require("../../../flowpath-handler");
var methodManager = require("../../../methodManager");
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

                samples.add(time, {'Type': 'HTTP',
                        'Method': req.method,
                        'URL': req.url,
                        'Request headers': req.headers,
                        'Status code': res.statusCode},
                    samples.truncate(req.url));
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
                samples.add(time, obj, 'HTTP Client: ' + obj.URL);
            });
        });
    });


    // client probe
    proxy.before(obj, 'request', function(obj, args) {

        if(nt.paused) return;

        var getNamespace = require('continuation-local-storage').getNamespace,
            namespace = getNamespace('cavissonNamespace');

        var requestedObj=namespace.get('httpReq');
        //  var requestedObj = util.getRequestObject(args);
        var trace = samples.stackTrace();
        var opts = args[0];
        var CavNDFPInstance = "";
        var current_fpid = requestedObj.flowPathId;

        if(current_fpid.indexOf(":") == -1)
            current_fpid = current_fpid;
        else
        {
            var id = current_fpid.split(":");
            current_fpid = id[0];
        }

        AgentSetting.seqId = AgentSetting.seqId + 1;

        var d1 =  domain.create();
        d1.seqId = AgentSetting.seqId ;

        var seqPfx = AgentSetting.flowMap[requestedObj.flowPathId].seqPfx;

        if(AgentSetting.flowMap[requestedObj.flowPathId].tlFirstTierFPID == undefined) {
            d1.run(function()
            {
                CavNDFPInstance = current_fpid + "_" + seqPfx + "." + process.domain.seqId;
            });
        }else
        {
            d1.run(function()
            {
                CavNDFPInstance = AgentSetting.flowMap[requestedObj.flowPathId].tlFirstTierFPID + "_" + current_fpid + "_" + seqPfx + "." + process.domain.seqId;
            });
        }
        opts.headers = {'CavNDFPInstance':CavNDFPInstance};

        proxy.callback(args, -1, function(obj, args) {

            var res = args[0];
            proxy.before(res, ['on', 'addListener'], function(obj, args) {

                if(args[0] !== 'end') return;

                proxy.callback(args, -1, function(obj, args) {


                    var time = opts.__time__;
                    if(!time || !time.done()) return;

                    try {
                        var obj = {
                            'Type': 'HTTP',
                            'Method': opts.method,
                            //'URL': (opts.hostname || opts.host) + (opts.port ? ':' + opts.port : '') + (opts.path || '/'),
                            'URL': (opts.hostname || opts.host) + (opts.port ? ':' + opts.port : '') + ('/'),
                            'Request headers': opts.headers,
                            'Response headers': res.headers,
                            'Stack trace': trace,
                        };
                        var backendName = obj.Type + '_' + obj.URL;

                        util.logger.info("Backend name is : "+backendName);
                        samples.add(time, obj, 'HTTP Client: ' + obj.URL);

                        backendRecord.handleBackendRecord(obj,time,backendName);


                        var flw = AgentSetting.flowMap[requestedObj.flowPathId].seqblob;
                        var methodId = AgentSetting.backendRecordMap[backendName].methodId;
                        var appending_T = "";

                        d1.run(function()
                        {
                            appending_T = flw + 'T' + process.domain.seqId + ':' + methodId + ':' + parseInt(time.ms) + ':' + '1' + ':' + '-' + '_' ;
                        });

                        AgentSetting.flowMap[requestedObj.flowPathId].seqblob = appending_T;

                        d1.seqId = 0;

                    }catch(err){
                        util.logger.warn("Error in creating Backend : "+err);
                    }
                });
            });
        });
    });
};



