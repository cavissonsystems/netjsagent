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


var nt;
var agentSetting = require('../../agent-setting.js');
var util = require("../../util");
var infoBuffer;
var metricsBuffer = [];
var samplesBuffer = [];

exports.init = function() {
    nt = global.nodetime;

    nt.on('info', function(info) {
        if(!nt.headless)
            infoBuffer = info;
    });
    nt.on('metric', function(metric) {
            metricsBuffer.push(metric);
    });

    nt.on('sample', function(sample) {
        samplesBuffer.push(sample);
    });

    setInterval(function() {
        try {
            //sendInfo();
            sendMetrics();
            sendSamples();
        }
        catch(e) {
            util.logger.error(e);
        }
    }, 2000);


    // empty buffer if no sessionId for more than 30 sec
   /* setInterval(function() {
        try {
            if(!nt.sessionId)
                metricsBuffer = [];
        }
        catch(e) {
            nt.error(e);
        }
    }, 30000);*/
};


var sendInfo = function() {
    if(!nt.sessionId || !infoBuffer) return;

    nt.agent.send({cmd: 'updateData', args: infoBuffer});
    infoBuffer = undefined;
};


var sendMetrics = function() {
    if(metricsBuffer.length == 0) return;
    //if(!agentSetting.isToInstrument) return ;

    var temp="";
    for (i in metricsBuffer) {
        temp=temp+metricsBuffer[i];
    }
    if(agentSetting.autoSensorConnHandler && agentSetting.autoSensorConnHandler.client)
        agentSetting.autoSensorConnHandler.write(temp);
    metricsBuffer = [];
};


var sendSamples = function() {
try {
    if (samplesBuffer.length == 0) return;

    if(!agentSetting.isToInstrument) return ;

    var temp="";
    for (i in samplesBuffer) {
       temp=temp+samplesBuffer[i];
    }
    agentSetting.dataConnHandler.write(temp);

    /* // send slowest macro samples
     var macroOps = samplesBuffer.filter(function(sample) {
     return sample.isMacro;
     });

     var macroOps = macroOps.sort(function(a, b) {
     return b._ms - a._ms;
     });

     for(var i = 0; i < (macroOps.length < 10 ? macroOps.length : 10); i++) {
     nt.agent.send({cmd: 'updateData', args: macroOps[i]});
     }


     // send slowest non-macro samples
     var simpleOps = samplesBuffer.filter(function(sample) {
     return !sample.isMacro;
     });

     var simpleOps = simpleOps.sort(function(a, b) {
     return b._ms - a._ms;
     });*/

    /*for(var i = 0; i < (simpleOps.length < 10 ? simpleOps.length : 10); i++) {
     nt.agent.send({cmd: 'updateData', args: simpleOps[i]});
     }*/


    samplesBuffer = [];
}
    catch(err){
        util.logger.warn(err)
    }
};


