var util = require('util'),
	falafel = require('falafel'),
	cavUtils = require('../util.js'),
	compareVersion = require('../utils/compare-verssions'),
    path = require('path'),Syntax ,
	cwd =  process.cwd().substring(process.cwd().lastIndexOf(path.sep)+1,process.cwd().length);
	try {
		Syntax = require('falafel/node_modules/esprima').Syntax;
	}catch(err){Syntax = require('./Syntax.js')};

var nodeVersion = process.version
var version = compareVersion(nodeVersion,'v6.0.0'),
	options={};
if(version == -1){
	falafel = require('./index.js')
	options = {range: true, loc: true}
}else{
	falafel = require('falafel')
	options = {ranges: true, locations: true}
}

var INSERT_FLOW_PATH_CTX="var _cavisson_req =  cavisson_isArgumentContainReq(arguments);if(_cavisson_req)eval(\'var _cavisson_defined_req=_cavisson_req \');";
var TRACE_ENTRY = 'var __njsEntryData__ = __njsTraceEntry__({file: %s, name: %s, line: %s, args: %s,methodName: %s});';
var TRACE_EXIT = '__njsTraceExit__({file: __njsEntryData__.file,name: __njsEntryData__.name,flowPathObj:__njsEntryData__.flowPathObj,methObj:__njsEntryData__.methObj,dumpedMethodName:__njsEntryData__.dumpedMethodName,cavIncludeFp:__njsEntryData__.cavIncludeFp,exception: %s, line: %s, returnValue: %s, args: %s});';
//var TRACE_EXIT = '__njsTraceExit__({entryData: __njsEntryData__, exception: %s, line: %s, returnValue: %s, args: %s});';
//var ON_CATCH = 'if (__njsOnCatchClause__) {\n__njsOnCatchClause__({entryData: __njsEntryData__});\n}';
//var ON_CATCH = 'if (__njsOnCatchClause__) {\n__njsOnCatchClause__({entryData: __njsEntryData__,error: %s,cavIncludeFp:__njsEntryData__.cavIncludeFp});\n}';
var ON_CATCH = 'if (__njsOnCatchClause__) {__njsOnCatchClause__({entryData: __njsEntryData__,error: %s,cavIncludeFp:__njsEntryData__.cavIncludeFp});}';
var functionArray = new Array();

/**
 * Creates a new instance of Instrumentation "class"
 * @class Provides instrumentation functionality
 * @param {NJSTrace} njsTrace - A reference to an NJSTrace object
 * @constructor
 */
function Injector(njsTrace) {
	this.njs = njsTrace;
}

/**
 * Returns whether the given node is a function node
 * @param {Object} node - The node to check
 * @returns {boolean}
 */
Injector.prototype.isFunctionNode = function(node) {
	return (node.type === Syntax.FunctionDeclaration || node.type === Syntax.FunctionExpression || node.type === Syntax.ArrowFunctionExpression) && node.range;
};

/**
 * Gets the function name (if this node is a function node).
 * @param {object} node - The falafel AST node
 * @returns {string} The function name
 */
Injector.prototype.getFunctionName = function(node) {
	// Make sure this is a function node.
	if (!this.isFunctionNode(node)) {
		return;
	}

	// Not all functions have ids (i.e Anonymous functions), in case we do have id we can get it and stop.
	if (node.id) {
		return node.id.name;
	}

	// FunctionDeclaration (function foo(){...}) should ALWAYS have id,
	// so in case this is FunctionDeclaration and it had no id it's an error.
	if (node.type === Syntax.FunctionDeclaration) {
		this.njs.emit(this.njs.prototype.events.Error, new Error('A FunctionDeclaration node has no id data, node:' + JSON.stringify(node)));
		return '';
	}

	// So this is an anonymous FunctionExpression, we try to get a name using the parent data,
	// for example in case of: var foo = function(){}, the name would be foo.
	var parent = node.parent;
	switch (parent.type) {
		// var f; f = function () {...}
		case Syntax.AssignmentExpression:
			// Extract the variable name
			if (parent.left.range) {
				return parent.left.source().replace(/"/g, '\\"');
			}
			break;

		// var f = function(){...}
		case Syntax.VariableDeclarator:
			return parent.id.name;

		// IIFE (function(scope) {})(module);
		case Syntax.CallExpression:
			return parent.callee.id ? parent.callee.id.name : '[Anonymous]';

		// Don't give up, can still find
		default:
			// Happens when a function is passed as an argument foo(function() {...})
			if (typeof parent.length === 'number') {
				return parent.id ? parent.id.name : '[Anonymous]';
				// Not sure when this happens...
			} else if (parent.key && parent.key.type === 'Identifier' &&
				parent.value === node && parent.key.name) {
				return parent.key.name;
			}
	}

	return '[Anonymous]';
};

/**
 * Inject njsTrace tracing functions into the given code text
 * @param {string} filename - The file being instrumented
 * @param {string} code - The JS code to trace
 * @param {Boolean} wrapFunctions - Whether to wrap functions in try/catch
 * @param {boolean} includeArguments - Whether a traced function arguments and return values should be passed to the tracer
 * @param {boolean} wrappedFile - Whether this entire file is wrapped in a function (i.e like node is wrapping the modules in a function)
 * @returns {string} The modified JS code text
 */
Injector.prototype.injectTracing = function(filename, code, wrapFunctions, includeArguments, wrappedFile) {
	try {
		var self = this;
		var traceExit;
		var traceEntry;
		var relPath = path.relative(process.cwd(), filename);
		var output = falafel(code, options, function (node) {
			// If we have name this is a function
			var name = self.getFunctionName(node);
			if (name) {
				try {

					/* agent.allMethodsArray.push(name);
					 agent.allMethodsObj[name] = agent.allMethodsArray.length -1 ;*/
					/*var file = path.basename(filename,'.js');
					 var dirName = path.dirname(filename)+'.'+path.basename(filename,'.js')+'.'+name+'_'+node.loc.start.line;
					 self.njs.log('  Instrumenting ',dirName)*/
					//self.njs.log('  Instrumenting ', name, 'line:', node.loc.start.line,' , Filename : ',file);

					// Separate the function declaration ("function foo") from function body ("{...}");
					var funcDec = node.source().slice(0, node.body.range[0] - node.range[0]);
					var origFuncBody = node.body.source();
					if(origFuncBody.trim().startsWith('{'))
						origFuncBody = origFuncBody.slice(1, origFuncBody.length - 1); // Remove the open and close bra
					else
						return;
					//origFuncBody = origFuncBody.slice(0, origFuncBody.length ); // Remove the open and close brac

					/*If there is any custom instrumentation, then this function will
					change the code of original function by specified code*/
					for(var key in self.njs.customInstrData){
						if(relPath.indexOf(key) > -1)
							origFuncBody = self.njs.customInstrData[key].methodName == name ? self.njs.customInstrData[key].code : origFuncBody
					}

					// If this file is wrapped in a function and this is the first line, it means that this is the call
					// to the file wrapper function, in this case we don't want to pass the arguments (as this function is hidden from the user)
					// In reality it means that this is the function that Node is wrapping all the modules with and call it when
					// the module is being required.
					// We also ignore arguments if we explicitly told to do so
					var args = (wrappedFile && node.loc.start.line === 1) || !includeArguments ? 'null' : 'arguments';
					// put our TRACE_ENTRY as the first line of the function and TRACE_EXIT as last line
					var dirName = path.dirname(relPath),
						baseName = path.basename(relPath, '.js'),
						methodName;
					if(dirName == '.')dirName = cwd;
					if(name.indexOf('.') > -1){
						var methods=name.split('.'),
							temp='';
						for(var i=0 ;i< methods.length ; i++){
							if((i + 1) === methods.length)
								temp +='.' + methods[i]
							else
								temp += '$'+methods[i];
						}
						methodName = dirName + "." + baseName + temp+ ';'+(node.loc.start.line) ;
					}
					else
						methodName = dirName + "." + baseName + '.' + name + ';'+(node.loc.start.line) ;
					var traceEntry = util.format(TRACE_ENTRY, JSON.stringify(relPath), JSON.stringify(name), node.loc.start.line, args,JSON.stringify(methodName));

					traceExit = util.format(TRACE_EXIT, 'false', node.loc.end.line, 'null', args);

					var newFuncBody = ';' +traceEntry + ';' + origFuncBody + ';' + traceExit + ';';
					if (wrapFunctions) {
						var traceEX = util.format(TRACE_EXIT, 'true', node.loc.start.line, 'null', args);
						node.update(funcDec + '{\ntry {' + newFuncBody + '} catch(__njsEX__) {\n' + 'console.log(__njsEX__.stack);\n' + traceEX + '\nthrow __njsEX__;\n}\n}');
					} else {
						node.update(funcDec + '{' + newFuncBody + '}')
					}
				} catch (err) {
					cavUtils.logger.warn(err)
				}

				// If this is a return statement we should trace exit
			} else if (node.type === Syntax.ReturnStatement) {
				try{
				// If this return stmt has some argument (e.g return XYZ;) we will put this argument in a helper var, do our TRACE_EXIT,
				// and return the helper var. This is because the return stmt could be a function call and we want
				// to make sure that our TRACE_EXIT is definitely the last call.
				/*if (node.argument) {
					// Use a random variable name
					var tmpVar = '__njsTmp' + Math.floor(Math.random() * 10000) + '__';

					// We wrap the entire thing in a new block for cases when the return stmt is not in a block (i.e "if (x>0) return;").
					traceExit = util.format(TRACE_EXIT, 'false', node.loc.start.line, includeArguments ? tmpVar : 'null', args);
					node.update('{\nvar ' + tmpVar + ' = ' + node.argument.source() + ';\n' + traceExit + '\nreturn ' + tmpVar + ';\n}');
				} else {*/
					traceExit = util.format(TRACE_EXIT, 'false', node.loc.start.line, 'null', args);
					node.update('{' + traceExit + node.source() + '}');
				//}
			}
			catch(err)
				{cavUtils.logger.warn(err)}

				// Let the app know that there was an exception so it can adjust the stack trace or whatever
			}
			else if (node.type === Syntax.CatchClause) {
				try {

					var errVar =  node.param.name;
					var origCatch = node.body.source();
					origCatch = origCatch.slice(1, origCatch.length - 1); // Remove the open and close braces "{}"
					var traceCatch = util.format(ON_CATCH, errVar);
					node.body.update('{' + traceCatch + ';' + origCatch + ';}' );
				}
				catch(err)
				{cavUtils.logger.warn(err)}
			}
		});
		return output.toString();
	} catch (err)
	{cavUtils.logger.warn('Error in file : ',filename,' ,Exception : ',err);
        return code;}

};

Injector.prototype.loadedFunctions = function loadFunctions(){
	return functionArray;
};
module.exports = Injector;
