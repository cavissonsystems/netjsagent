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
    proxy.around(obj, 'request', function(obj, args, locals) {
            return;
        },
        function(obj, args, ret,locals) {
            return;
        }
    );
};



