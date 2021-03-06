var util = require('util'),
	path = require('path'),
    fs = require('fs'),
	extend = require('extend'),
	fnmatch = require('./fnmatch.js'),
	Module = require('module'),
	EventEmitter = require('events').EventEmitter,
	Injector = require('./injector.js'),
	Output = require('./output.js'),
	Tracer = require('./tracer.js'),
	Formatter = require('./formatter.js'),
	cavUtils = require('../util.js'),
methodManager=require('./../methodManager');

try {
    var DEFAULT_CONFIG = {
        enabled: true,
        //files: ['**/*.js', '!**/node_modules/**','**/node_modules/pg/lib/client.js'],
        files: ['**/*.js','!**/node_modules/**','!**/node_modules/netjsagent/**'],
        wrapFunctions: false,
        logger: false,
        inspectArgs: true,
        formatter: undefined
    };
}
catch(err)
{cavUtils.logger.warn(err)}

 /**
 * Creates a new instance of NJSTrace
 * @class The main class that is responsible for the entire njsTrace functionality
 * @extends EventEmitter
 * @constructor
 */
function NJSTrace() {
	EventEmitter.call(this);
 }
util.inherits(NJSTrace, EventEmitter);

/**
 * NJSTrace exposed event names
 * @type {object}
 * @property {string} Error - An error event
 * @property {string} Warn - A warning event
 * @example
 * njsTrace.on(NJSTrace.events.error, function() {...});
 */
NJSTrace.events = {
	error: 'error',
	warn: 'warn'
};

// Define some properties with get/set on the prototype
Object.defineProperties(NJSTrace.prototype, {
	/**
	 * See "enabled" property on {@link NJSTrace.NJSConfig}
	 * @memberOf! NJSTrace.prototype
	 */
	'enabled': {
		get: function() {return this.config.enabled;},
		set: function(value) {
			this.config.enabled = !!value;
			this.log('NJSTrace enabled property changed to: ', this.config.enabled);
		}
	}
});

/**
 * Start the njsTrace instrumentation process
 * @param {NJSTrace.NJSConfig} [config] - A configuration object
 */
NJSTrace.prototype.customInstrData = {}			//CustomData map key:value <"file path" :"Custom rule provided in file">
NJSTrace.prototype.processInstrumentationProfile = function(instrumentationFile) {
	/*Adding other modules for instrumentation.*/
	var data = Object.keys(instrumentationFile);
	if(data.length) {
		DEFAULT_CONFIG.files = [];
		DEFAULT_CONFIG.files.push('!**/node_modules/**')
		for(i in data) {
			if(instrumentationFile[data[i]].instrument === true ) {
				if(instrumentationFile[data[i]].modulename.indexOf('**/*.js') !== -1)
					DEFAULT_CONFIG.files.splice(0,0,data[i]);
				else if (instrumentationFile[data[i]].modulename.indexOf('**/node_modules/**') !== -1)		/*If user want to instrument all node_modules so adding this field in array*/
					DEFAULT_CONFIG.files.splice(1,1,data[i]);
				else
					DEFAULT_CONFIG.files.push(data[i]);
			}
			else if(instrumentationFile[data[i]].instrument === false ){
				DEFAULT_CONFIG.files.push('!'+data[i])
			}
		}
		DEFAULT_CONFIG.files.push('!**/node_modules/netjsagent/**') 		//Dont need to instrument agent code
	}

	var customData= require('./../../jsCustomInstrumentation.json')			//Reading custom instrumentation profile
	for(var i in customData) {
		customData[i].fileName && DEFAULT_CONFIG.files.push(customData[i].fileName)
		var fileName = customData[i].fileName.replace(/[**]/g, '')			//Removing '**' from filePath
			fileName = fileName.substring(1,fileName.length)
		this.customInstrData[fileName] =  customData[i]
	}
}

NJSTrace.prototype.inject = function(config,instrumentationFile,enableWrapping) {
	// Merge the config with the default config
    this.config = {};
	this.processInstrumentationProfile(instrumentationFile)

	extend(true, this.config, DEFAULT_CONFIG, config);
	this.config.files = (config && config.files) || this.config.files; // In arrays we want to replace, not extend
	this.config.wrapFunctions = enableWrapping							//enable/disbale wrapping of injected data by try catch

	// Set the logger
	this.logger = new Output(this.config.logger);

	this.log('New instance of NJSTrace created with config:', this.config);

	// Warn about the use of wrapFunctions
	if (this.config.wrapFunctions) {
		this.log('WARN: wrapFunctions is set, it might affect V8 optimizations, set it to false if performing benchmarks');
	}

	// Create a formatter
	var formatters = this.getFormatters(this.config.formatter);
	if (formatters.length < 1) {
		throw new Error('Invalid formatter type in config, must be either an instance of Formatter, or config object, or array of each');
	}

	// Set the tracer
	this.tracer =  new Tracer(formatters);

	this.hijackCompile();
	this.setGlobalFunction();

	this.log('njsTrace done loading...');
	return this;
};

/**
 * Simple logger function
 * @param {...(string|number|object)} arguments
 * @private
 */
NJSTrace.prototype.log = function() {
    var msg = util.format.apply(this, arguments) + '\n';
	cavUtils.logger.info("0 | ",msg);

	/*if (!this.logger) {
		return;
	}

	// Don't want to insert our prefix into args (can effect format strings), so use print which doesn't put newline.
	this.logger.print('njsTrace: ');
	this.logger.write.apply(this.logger, arguments);*/
};

/**
 * Hijack Node.js Module._compile method and inject the tracing stuff...
 * @private
 */
NJSTrace.prototype.hijackCompile = function() {
	var self = this;
	var injector = new Injector(this);

	// Save a reference to the _compile function and hijack it.
	var origCompile = Module.prototype._compile;
	Module.prototype._compile = function(content, filename) {
        try {
            // Check if we should instrument this file

            var relPath = path.relative(process.cwd(), filename);

            var instrument = fnmatch(relPath, self.config.files);

            if (instrument) {
				//cavUtils.instrumentedModules[filename]=true;
                // The content of a node Module needs to get wrapped in a function, otherwise it might be invalid (esprima won't like it otherwise).
                // We wrap it like node.js is wrapping (see Module.prototype._compile), since this logic might change we
                // check that the wrapping is done using 2 parts, if not just skip the wrapping and hope esprima won't fail :)
                var wrapped = true;
                if (Module.wrapper.length === 2) {
                    // It is important to add the \n between wrapper[0] and content as we don't want any user functions to
                    // be in the first line of the file (we assume in the injector that the first line is the module wrapping function only)
                    content = Module.wrapper[0] + ';' + content + Module.wrapper[1];
                } else {
                    wrapped = false;
                    self.log('WARN !! It seems like the node.js version you are using has changed and might be incompatible with njsTrace');
                }

                try {
                    content = injector.injectTracing(filename, content, self.config.wrapFunctions, self.config.inspectArgs, wrapped);
                    // If we wrapped the content we need now to remove it as node.js original compile will do it...
                    if (Module.wrapper.length === 2) {
                        content = content.substring(Module.wrapper[0].length, content.length - Module.wrapper[1].length);
                    }
                    self.log('Done:', filename);
                } catch (ex) {
                    cavUtils.logger.warn('ERROR: Error instrumenting file:', filename, ', Exception:', ex);
                }
            }

            // And continue with the original compile...
            origCompile.call(this, content, filename);
        }
        catch(err)
        {
            cavUtils.logger.warn('ERROR: Error instrumenting file:', filename, ', Exception:', err,'Content : ',content)
        }
	};
};

/**
 * Sets njsTrace tracing functions on the global context
 * @private
 */
function isReqInclude() {
    try {
          var getNamespace = require('../utils/continuation-local-storage').getNamespace('cavissonNamespace');
         var namespace = getNamespace.get('httpReq')

         if(namespace)
            return namespace.cavIncludeFp;
         else
            return false;
    }
    catch (e) {
        return false;
    }
}
NJSTrace.prototype.setGlobalFunction = function() {
	var self = this;

	global.__njsEntryData__ = {}						//Adding global entryData Object, if in case entry is not added in instrumented code then exit will throw exception like cant read property entryData of undefined.

	global.__njsTraceEntry__ = function(args) {
        try {
            //var req = methodManager.isReqToInstrument()
		/*if (methodManager.isReqToInstrument()) {
            args.cavIncludeFp = true; ;
		}
        else{
            args.cavIncludeFp = false ;
            return args;
        }*/

            methodManager.onEntry(args);
		} catch (ex) {
            cavUtils.logger.warn('ERROR: Exception occurred on tracer entry:', ex);
		}
        return args;
	};

	//this.log('Setting global.__njsTraceExit__ function');
	global.__njsTraceExit__ = function(args) {

		if (!args.cavIncludeFp) {
			return;
		}

		try {
			//self.tracer.onExit(args);
            methodManager.onExit(args);
		} catch (ex) {
            cavUtils.logger.warn('ERROR: Exception occurred on tracer exit:', ex);
		}
	};

	//this.log('Setting global.__njsOnCatchClause__ function');
	global.__njsOnCatchClause__ = function(args) {
		if (!args.cavIncludeFp) {
			return;
		}
		try {
            //methodManager.onExit(args);
			methodManager.onCatchClause(args);
		} catch (ex) {
            cavUtils.logger.warn('ERROR: Exception occurred on tracer onCatchClause:', ex);
		}
	};

	global.cavisson_isArgumentContainReq = function(args)
	{
		var cavisson_details_obj = new Object();
		try {
			for (var i = 0; i < args.length; i++) {

					if(args[i] === undefined)
					continue;
					if (args[i].constructor.name == 'IncomingMessage')
					{
						if(args[i].flowPathId)
						{
						cavisson_details_obj.flowPathId = args[i].flowPathId;
						cavisson_details_obj.timeInMillis = args[i].timeInMillis;
						cavisson_details_obj.res = args[i].res;
							cavisson_details_obj.req = args[i];

						return cavisson_details_obj;
						}
					}

					if(args[i].raw != undefined && args[i].raw !=null )
					{
						if(args[i].raw.req.flowPathId) {
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
			//cavUtils.logger.warn("Error in getting cavisson arguments : " + err)
		}
	}
};

/**
 * Build a formatter array from the given config
 * @private
 */
NJSTrace.prototype.getFormatters = function(formatterConfig, result) {
	var self = this;
	result = util.isArray(result) ? result : []; // If we got array use it

	// If not formatter specified create the default formatter
	if (formatterConfig === null || typeof formatterConfig === 'undefined') {
		result.push(new Formatter());

	// If this is already a Formatter instance, use it
	} else if (formatterConfig instanceof Formatter) {
		result.push(formatterConfig);

	// If this is an array, loop thru the array and add it to our result
	} else if (util.isArray(formatterConfig)) {
		formatterConfig.forEach(function (fmt) {
			self.getFormatters(fmt, result);
		});

	// If this is an object then treat it as if it was the config for the default formatter
	} else if (typeof formatterConfig === 'object') {
		result.push(new Formatter(formatterConfig));
	}
	return result;
};

/**
 * A reference to an NJSTrace instance
 * @returns {NJSTrace} An instance of NJSTrace
 */
module.exports = new NJSTrace();

/**
 * This callback is called when there is a message to log
 * @callback NJSTrace.onLog
 * @property {string} message - The log message
 */

/**
 * The njsTrace config object
 * @typedef {object} NJSTrace.NJSConfig
 *
 * @property {boolean} [enabled=true] - Whether tracing is active. Note: njsTrace will instrument the code regardless of this setting.
 *
 * @property {string|string[]} [files=<see description>] - A glob file pattern(s) that matches the files to instrument,
 * this supports any pattern supported by "minimatch" npm module.
 * The matching is case-insensitive. Patterns are processed in-order with an 'or' operator, unless it's a
 * negative pattern (i.e starts with "!") which negates (if match) all matches up to it.
 * All file paths are processed RELATIVE to the process working directory.
 * DEFAULT = All .js files EXCLUDING everything under node_modules (['**\/*.js', '!**\/node_modules\/**'])
 *
 * @property {boolean} [wrapFunctions=true] - Whether njsTrace should wrap the injected functions with try/catch
 * NOTE: wrapping functions with try/catch prevents from v8 to optimize the function, don't use when profiling
 *
 * @property {boolean|string|NJSTrace.onLog} [logger=false] - Controls where the logger output should go
 * If Boolean, indicates whether NJSTrace will log (to the console) its progress.
 * If string, a path to an output file (absolute or relative to current working dir).
 * If function, this function will be used as logger
 *
 * @property {boolean} [inspectArgs=true] - Whether njsTrace should inspect the traced functions arguments and return values
 *
 * @property {Formatter|Formatter.Config|(Formatter|Formatter.Config)[]} [formatter=undefined] - An instance of formatter to use for output.
 * if object, a configuration to the default Formatter (see {@link Formatter.Config}).
 * if Array, a list of formatters to use, or a list of configurations for the default formatter (can be mixed).
 */

/**
 * @typedef {object} NJSTrace.functionEntryArgs
 * @property {string} name - The traced function name
 * @property {string} file - The traced file
 * @property {Number} line - The traced function line number
 * @property {Object} args - The function arguments object
 * @protected
 */

/**
 * @typedef {object} NJSTrace.functionExitArgs
 * @property {Object} entryData - An object that was returned from NJSTrace.onFunctionEntry
 * @property {String} exception - Whether the exit occurred due to exception (throw Statement).
 *                                if "TRUE" then it was an unhandled exception
 * @property {number} line - The line number where the exit is
 * @property {*|undefined} returnValue - The function return value
 * @protected
 */

/**
 * @typedef {object} NJSTrace.catchClauseArgs
 * @property {Object} entryData - An object that was returned from NJSTrace.onFunctionEntry
 * @protected
 */

