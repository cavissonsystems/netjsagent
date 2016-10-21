/**
 * Created by sahil on 10/6/2015.
 */
var winston = require('winston');
var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');

function util (){}
util.logger=undefined;

util.initializeLogger = function()
{
    try {
        var logDir = "/tmp/cavisson/logs";
        //var logDir = path.join(path.resolve(__dirname),"/../logs");

        if (!fs.existsSync(logDir))        // Create the directory if it does not exist
        {
            mkdirp(logDir, function (err) {
            });
        }

        var options = {

        }
        util.logger = new (winston.Logger)
        ({
            transports: [
                new (winston.transports.File)({
                    timestamp: function() {
                        var date = new Date();
                        return date;
                    },
                    name: 'info-file',
                    filename: logDir + '/nd_node_debug.log',      // file for both output
                    level: 'info',
                    maxsize: 5242880, //10MB 5242880 1048570
                    maxFiles: 3,
                    json: false,
                    formatter: function(options) {
                        // Return string will be passed to logger.
                        return options.timestamp() +' | '+ process.pid+ ' | '+options.level.toUpperCase() +' | '+ (undefined !== options.message ? options.message : '') +
                            (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
                    }
                }),
                new (winston.transports.File)({
                    timestamp: function() {
                        var date = new Date();
                        return date;
                    },
                    name: 'error-file',
                    filename: logDir + '/nd_node_error.log',            // file only in case of error
                    level: 'warn',
                    handleExceptions: true,
                    humanReadableUnhandledException: true,
                    maxsize: 5242880, //10MB
                    maxFiles: 2,
                    json: false,
                    formatter: function(options) {
                        // Return string will be passed to logger.
                        return options.timestamp() +' | '+ process.pid+ ' | '+ options.level.toUpperCase() +' | '+ (undefined !== options.message ? options.message : '') +
                            (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
                    }
                })
            ]
        });
    }

    catch(err){console.log(err)}


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
        if(err) util.logger.warn(err);
        util.logger.info('error', 'Fatal uncaught exception crashed cluster', err, function(err, level, msg, meta) {
            if(err) util.logger.warn(err);
        });
    });*/
    util.logger.info("Hey !! New test started , Initializing logger");
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
