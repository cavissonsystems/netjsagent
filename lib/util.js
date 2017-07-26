/**
 * Created by sahil on 10/6/2015.
 */

var package_json = require('./../package.json')
var winston = require('winston');
var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');
var os = require('os');
var heapStatistics ;
try{
    heapStatistics= require('v8').getHeapStatistics();
}
catch(e){console.log("cant find module v8")}
function util (){}
util.logger=undefined;
util.instrumentedModules={};                    //All instrumented files from njstrace
util.netjsagentVersion =  package_json.version
function checkAndCreateDir(logDir,os,pid,instanceName,logLevel){
    if (!fs.existsSync(logDir)) {        // Create the directory if it does not exist
        mkdirp(logDir, function (err) {
        });
    }
    /*
     * When instance will restart we dont have instance name ,so control will move to else case and create the file name
     * using process_id . nd_node_debug_1126.log
     * In case we have instace name, that means contol is coming from start_instrumentation so we rename the old file name
     * from process_id to instance name  nd_node_debug_1126.log ---> nd_node_debug_svr12.log
     * */

    if (instanceName) {
        var curr, newFile=[];
        var dir = fs.readdirSync(logDir)
        for (i in dir) {
            if (dir[i].indexOf(pid) !== -1) {
                var file = dir[i]
                if (file.indexOf('error') > -1) {
                    if (os == 'window') {
                        curr = logDir + '\\' + file;
                        newFile[1] =  logDir + '\\nd_node_error_' + instanceName + '.log'
                        fs.renameSync(curr, newFile[1])
                    }
                    else if (os == 'linux') {
                        curr = logDir + '/' + file;
                        newFile[1] = logDir + '/nd_node_error_' + instanceName + '.log'
                        fs.renameSync(curr, newFile[1])
                    }
                }
                else {
                    if (os == 'window') {
                        curr = logDir + '\\' + file;
                        newFile[0] = logDir + '\\nd_node_' + logLevel + '_' + instanceName + '.log'
                        fs.renameSync(curr, newFile[0])
                    }
                    else if (os == 'linux') {
                        curr = logDir + '/' + file;
                        newFile[0] = logDir + '/nd_node_' + logLevel + '_' + instanceName + '.log'
                        fs.renameSync(curr, newFile[0])
                    }
                }
            }
        }
        return newFile
    }
    else {
        if (os == 'window')
            return [ logDir + '\\nd_node_' + logLevel + '_' + pid + '.log' , logDir + '\\nd_node_error_' + pid + '.log'];
        else if (os == 'linux')
            return [logDir + '/nd_node_' + logLevel + '_' + pid + '.log' , logDir + '/nd_node_error_' + pid + '.log']
    }
}

util.initializeLogger = function(logLevel,BCILoggingMode,instanceName,isTestRunning)
{
    try {
        var machine = os.type(),
            logDir,
            filename;
        if(machine.indexOf('Windows') != -1){
            logDir='C:\\netjsagent\\logs';
            filename = checkAndCreateDir(logDir,'window',process.pid,instanceName,logLevel)
            //filename = logDir+'\\nd_node_'+logLevel+'_'+instanceName+'.log';
        }
        else if(machine.indexOf('Linux') != -1) {
            logDir = "/tmp/cavisson/logs";
            filename = checkAndCreateDir(logDir,'linux',process.pid,instanceName,logLevel)
            //checkAndCreateDir(logDir,'linux')
            //filename = logDir+'/nd_node_'+logLevel + '_'+instanceName+'.log';
        }
      /*  if(isTestRunning)         //Removing this check so when start_instrumention will come, new instance of logger will reinitialized
            return*/

        if(BCILoggingMode && BCILoggingMode.toUpperCase() == 'OUTPUT_STREAM'){
            util.logger = new (winston.Logger)
            ({
                transports: [
                    new (winston.transports.Console)({
                        timestamp: function () {
                            var date = new Date();
                            return date;
                        },
                        //level: logLevel,
                        colorize: true ,
                        /*formatter: function (options) {
                            // Return string will be passed to logger.
                            return options.timestamp() + ' | ' + process.pid + ' | ' + options.level.toUpperCase() + ' | ' + (undefined !== options.message ? options.message : '') +
                                (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '' );
                        }*/
                    })]
            });
        }
        else if(BCILoggingMode && (BCILoggingMode.toUpperCase() == 'FILE' || BCILoggingMode.toUpperCase() == 'BOTH')){
            util.logger = new (winston.Logger)
            ({
                transports: [
                    new (winston.transports.File)({
                        timestamp: function () {
                            var date = new Date();
                            return date;
                        },
                        name: 'info-file',
                        filename: filename[0],      // file for both output
                        level: logLevel,
                        maxsize: 5242880, //10MB 5242880 1048570
                        maxFiles: 3,
                        json: false,
                        formatter: function (options) {
                            // Return string will be passed to logger.
                            if(BCILoggingMode && BCILoggingMode.toUpperCase() == 'BOTH') {
                                console.log(options.timestamp() + ' | ' + process.pid + ' | ' + options.level.toUpperCase() + ' | ' + (undefined !== options.message ? options.message : '') +
                                    (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '' ))
                            }
                            return options.timestamp() + ' | ' + process.pid + ' | ' + options.level.toUpperCase() + ' | ' + (undefined !== options.message ? options.message : '') +
                                (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '' );
                        }
                    }),
                    new (winston.transports.File)({
                        timestamp: function () {
                            var date = new Date();
                            return date;
                        },
                        name: 'error-file',
                        filename: filename[1],            // file only in case of error
                        level: 'warn',
                        handleExceptions: true,
                        humanReadableUnhandledException: true,
                        maxsize: 5242880, //10MB
                        maxFiles: 2,
                        json: false,
                        formatter: function (options) {
                            // Return string will be passed to logger.
                            if(BCILoggingMode &&BCILoggingMode.toUpperCase() == 'BOTH') {
                                console.error(options.timestamp() + ' | ' + process.pid + ' | ' + options.level.toUpperCase() + ' | ' + (undefined !== options.message ? options.message : '') +
                                    (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '' ))
                            }
                            return options.timestamp() + ' | ' + process.pid + ' | ' + options.level.toUpperCase() + ' | ' + (undefined !== options.message ? options.message : '') +
                                (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '' );
                        }
                    })
                ]
            });
        }
    }
    catch(err){console.log(err.stack)}


    /* try
     {
     setInterval(function(){
     if(!fs.existsSync('/tmp/cavisson/logs/All-log-info.log')) {
     console.log("path node exists")
     util.initializeLogger();
     }
     },40000)
     }catch(err){console.log(err)}*/


    /*process.on('uncaughtException', function(err) {
        if(err) util.logger.warn(err.stack);
    });*/
    util.logger.info("-----------Initializing Cavisson NodeJS Agent ",util.netjsagentVersion,"------------",process.argv);
    util.logger.error("-----------Initializing Cavisson NodeJS Agent ",util.netjsagentVersion,"------------");
    util.logger.info('0 | command lines argument passed : ',process.argv);
    util.logger.info('0 | heap_size_limit :',(heapStatistics ? heapStatistics.heap_size_limit/1000000000 : 0)+' GB');

}

util.getRequestObject = function(functionArguments)
{
    if(functionArguments == null)

    {
        return null;
    }
    else if(functionArguments.callee.caller == null)
    {
        return null;
    }
    var requestedArgument = util.checkArguments(functionArguments, "IncomingMessage");


    if(requestedArgument.raw || requestedArgument)
        return requestedArgument;

    else
        return  util.getRequestObject(functionArguments.callee.caller.arguments);
}

util.checkArguments = function(args, type){
    var cavisson_details_obj = new Object();
    try {
        if(args == undefined){
            return;
        }
        for (var i = 0; i < args.length; i++) {

            if(args[i] === undefined)
                continue;
            if (args[i].constructor.name == type) {
                if(args[i].flowPathId) {
                    cavisson_details_obj.flowPathId = args[i].flowPathId;
                    cavisson_details_obj.timeInMillis = args[i].timeInMillis;
                    cavisson_details_obj.res = args[i].res;
                    cavisson_details_obj.req=args[i];
                    return cavisson_details_obj;
                }
            }
            if(args[i].raw != undefined && args[i].raw !=null )
            {
                if(args[i].raw.req.flowPathId)
                {
                    cavisson_details_obj.flowPathId = args[i].raw.req.flowPathId;
                    cavisson_details_obj.timeInMillis = args[i].raw.req.timeInMillis;
                    cavisson_details_obj.res = args[i].raw.res;
                    cavisson_details_obj.req=args[i].raw.req;
                    return cavisson_details_obj;
                }

            }
        }
        return false;
    }
    catch(err)
    {
        util.logger.warn("Error in checking arguments type" + err);
    }

}

util.canWrite= function (directory) {
    var stat = fs.statSync(directory);

    // 2 is the octal value for chmod -w-
    return !!( 2 & (stat.mode & parseInt('777', 8)).toString(8)[0] ) //first char is the owner
}

util.canRead= function (directory) {
    var stat = fs.statSync(directory);

    // 2 is the octal value for chmod -w-
    return !!( 1 & (stat.mode & parseInt('777', 8)).toString(8)[0] ) //first char is the owner
}

module.exports = util;
