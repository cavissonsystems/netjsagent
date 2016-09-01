/**
 * Created by bala on 10/7/15.
 */

var PropertiesReader = require('properties-reader');
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
var cluster = require('cluster');
var ndSettingFile = path.join(path.resolve(__dirname),'/../../ndSettings.conf');
var instrumentationFile = path.join(path.resolve(__dirname),'/../../instrumentation.conf');
var memwatch = require('memwatch-next');

NJSInstrument.prototype.instrument = function instrument(filename)
{
    try
    {
        memwatch.on('leak', function (info) {
            util.logger.warn("Memory is leaking : ");
            util.logger.warn(info);
            //util.logger.warn(process.memoryUsage());
        });


        var instance ;
        properties = PropertiesReader(ndSettingFile);

        var clusterPath = '/tmp/cavisson/cluster';
        if(!cluster.isMaster)
        {
            if(fs.existsSync(clusterPath)) {
                fs.readdir(clusterPath, function (err, files) {
                    try {
                        if (err)console.log(err);
                        files.forEach(function (file) {

                            var index = file.split('.')[0];

                            fs.readFile(clusterPath + '/' + file, function (err, pid) {
                                if (err)console.log(err);
                                if (pid == process.pid) {
                                    instance = properties.get('instance');
                                    if (instance.indexOf('_') != -1) {
                                        instance = instance.split('_')[0];
                                    }
                                    instance = instance + '_' + index;

                                    agentSetting.instance = instance;
                                }
                            });
                        });
                    }catch(err){console.log(err)}
                });
                }
        }

        util.initializeLogger();

        agentSetting.getData(ndSettingFile);      //getting data for making connection to ndc

        if(1 == agentSetting.enable_eventLoop_monitor) {                    //Starting the event loop manager
            util.logger.info("Going to initialized event_loop_monitor .");
            ndEventLoopMonitor.init();
        }

        if(1 == agentSetting.enable_garbage_profiler) {                    //Starting the event loop manager
            util.logger.info("Going to initialized heap_gc_monitor .");
            ndHeapGCMonitor.init();
        }

        btConf.getData(path.join(path.resolve(__dirname),'/../../ndBtRuleFile.txt'));

        njstrace.inject({formatter: methodmanager},instrumentationFile);

        agentSetting.getBTData(path.resolve(__dirname)+'/lib/BT/BTcategory');

        setTimeout(function(){clientConn.connectToServer();},1000);

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