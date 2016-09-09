/**
 * Created by bala on 10/7/15.
 */

var ndEventLoopMonitor = require('./lib/event_loop_moitor/ndEventLoopMonitor.js');
var ndHeapGCMonitor = require('./lib/heap_gc_monitor/ndHeapGCMonitor.js');
var njstrace = require('./lib/njstrace/njsTrace');
var path  = require('path');
var agentSetting = require("./lib/agent-setting");
var clientConn = require("./lib/client");
var methodmanager = require('./lib/methodManager');
var btConf = require('./lib/BT/btconfiguration');
var path = require('path');
var util = require('./lib/util');
var fs = require('fs');
var ndSettingFile = path.join(path.resolve(__dirname),'/../../ndSettings.conf');
var instrumentationFile = path.join(path.resolve(__dirname),'/../../instrumentation.conf');
var memwatch = require('memwatch-next');

NJSInstrument.prototype.instrument = function instrument(filename)
{
    try
    {
        memwatch.on('leak', function (info) {
            util.logger.warn(agentSetting.currentTestRun+ " | Memory is leaking : ");
            util.logger.warn(agentSetting.currentTestRun+ " | "+info);
            util.logger.warn(process.memoryUsage());
        });

        agentSetting.isCluster();

        util.initializeLogger();

        agentSetting.initAllMap();

        agentSetting.generateFPMask();

        agentSetting.getData(ndSettingFile);      //getting data for making connection to ndc

        btConf.getData(path.join(path.resolve(__dirname),'/../../ndBtRuleFile.txt'));

        njstrace.inject({formatter: methodmanager},instrumentationFile);

        agentSetting.getBTData(path.resolve(__dirname)+'/../../BTcategory');

        process.nextTick(function(){
            try {
                clientConn.connectToServer();
            }
            catch(e){
                util.logger.warn(e);
            }
        },1000);

        var nt = require('./lib/nodetime/index').profile();
    }
    catch(err){
        console.log(err);
    }
};

function NJSInstrument()
{

}

module.exports = new NJSInstrument();