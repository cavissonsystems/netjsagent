/*
Created by Sandeep & Shivam on Date 20th Aug, 2018
use : extract the arguments name of Functions from the loaded Modules Dynamically using Filters.
 */

var agentSetting = require('./agent-setting')
var util = require('./util')

var COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var DEFAULT_PARAMS = /=[^,]+/mg;
var FAT_ARROWS = /=>.*$/mg;
var functionCount = 0;
var moduleCount = 0;
var list;

function autoDiscovery(){}

function getParameterNames(fn) {
    var code = fn.toString()
        .replace(COMMENTS, '')
        .replace(FAT_ARROWS, '')
        .replace(DEFAULT_PARAMS, '');

    var result = code.slice(code.indexOf('(') + 1, code.indexOf(')'))
        .match(/([^\s,]+)/g);

    return result === null
        ? []
        : result;
}

autoDiscovery.findModules = function(ID,classFilters,methodFilters,dataSocket){
    try {
        var loadedModules = Object.keys(require('module')._cache);
        var modulePattern,
            functionPattern;
        try{
            if(classFilters.includes(',')){
                classFilters=classFilters.split(',').join('|');
                modulePattern=new RegExp(classFilters);
            }
            else {
                modulePattern = new RegExp(classFilters);
            }
        }catch(e){
            modulePattern = '/NA/';
            util.logger.error(agentSetting.currentTestRun +' | Invalid Regular Expression in classFilters So, setting as NA :',e)
        }
        try{
            if(methodFilters.includes(',')){
                methodFilters=methodFilters.split(',').join('|');
                functionPattern=new RegExp(methodFilters);
            }else{
                functionPattern = new RegExp(methodFilters);
            }
        }catch(e){
            functionPattern = '/NA/';
            util.logger.error(agentSetting.currentTestRun +' | Invalid Regular Expression in methodFilters So, setting as NA :',e)
        }
        var map = new Map();
        functionCount = 0;
        moduleCount = 0;
        var listValue;

        var start = new Date().getTime();
        loadedModules.forEach(function(module){
            if(modulePattern == '/NA/' && module.match('netjsagent') == null){
                ++moduleCount;
                listValue = requireModule(module,functionPattern)
                map.set(module,listValue);
            }
            else if(module.match(modulePattern) !== null && module.match('netjsagent') == null){
                ++moduleCount;
                listValue = requireModule(module,functionPattern)
                map.set(module,listValue);
            }
        })
        var end = new Date().getTime();

        dataSocket.write("agent_post_data_req:action=discover_loaded_classes;Id="+ID+";Tier="+agentSetting.getTierName()+";Server="+agentSetting.getServerName()+";Instance="+agentSetting.getInstance()+";\n");
        map.forEach(function(value,key,map){
            if(value){
                dataSocket.write(key+'|'+value.toString()+'\n')
            }else{
                dataSocket.write(key+'|\n')
            }
        })
        util.logger.info(agentSetting.currentTestRun + ' | agent_post_data_req:totalTimeTaken='+(end-start)+';totalClasses='+moduleCount+';totalMethods='+functionCount+';');
        dataSocket.write("agent_post_data_req:totalTimeTaken="+(end-start)+";totalClasses="+moduleCount+";totalMethods="+functionCount+";\n");
        try{
            if(dataSocket){
                dataSocket.closeConnection()
                delete dataSocket
            }
        }catch(e){
            util.logger.error(agentSetting.currentTestRun +' | Error in Closing New Connection :',e)
        }
    }catch(err){
        util.logger.error(agentSetting.currentTestRun +' | Error in finding the Module :',err)
    }
}

function requireModule(module,functionPattern){

    try{
        if(module){
            var moduleObject = require(module);
            return getmethodName(module, moduleObject, moduleObject.prototype ? moduleObject.prototype:undefined ,functionPattern);
        }
    }catch(e){
        util.logger.error(agentSetting.currentTestRun +' | Error during Loading the Module :',e)
    }
}

function getmethodName(moduleName,mainObject,protoObject,functionPattern){
    try{
        /*
        All First-Object Functions are Itterated over the Modules.
        */
        var list =[];
        //Iterate over the modules Object properties name.
        if(mainObject){
            for (var name in mainObject ) {
                //only properties which belong to the Module Object.
                if(mainObject.hasOwnProperty(name)){
                    //Escaping the getter and setter methods.
                    if (!mainObject.__lookupGetter__(name) && !mainObject.__lookupSetter__(name)) {
                        //for functions
                        if(typeof(mainObject[name]) == 'function') {
                            //Escaping the super Reference and prototype Reference.
                            if (!mainObject[name].__super__ &&
                                (mainObject[name].prototype ||
                                    (mainObject[name].prototype && Object.keys(mainObject[name].prototype).length == 0))
                                && Object.keys(mainObject[name]).length == 0) {

                                if(mainObject[name] && mainObject[name].name ){
                                    filterMethodName(mainObject[name],list,functionPattern)
                                }
                            }
                        }
                    }
                }
            }
        }

        //Iteraing for the Prototype Object
        if(protoObject){
            for(var name in protoObject){
                //The properties belong to the Prototype Object
                if(protoObject.hasOwnProperty(name)) {
                    //Escaping the getter and setter
                    if(!protoObject.__lookupGetter__(name) && !protoObject.__lookupSetter__(name)){
                        //Only Functions
                        if(typeof(protoObject[name]) == 'function'){
                            if(protoObject[name] && protoObject[name].name){
                                filterMethodName(protoObject[name],list,functionPattern)
                            }
                        }
                    }
                }
            }
        }


        return list;
    }catch(e){
        if(agentSetting.enableBciDebug > 4)
            util.logger.error(agentSetting.currentTestRun +' | Error in getmethodName'+i+' :',e)
    }
}

function filterMethodName(mainObject,list,functionPattern){
    try{
        var method = '',
            methodArgs;
        method = mainObject.name;
        if(functionPattern == '/NA/'){
            ++functionCount;
            methodArgs = getParameterNames(mainObject);
            concateMethodName(method,methodArgs,list);
        }else if(method.match(functionPattern) !== null){
            ++functionCount;
            methodArgs = getParameterNames(mainObject);
            concateMethodName(method,methodArgs,list);
        }
    }catch(e){
        util.logger.error(agentSetting.currentTestRun +' | Error in filterMethodName :',e)
    }
}

function concateMethodName(methodName,methodArgs,list){
    try{
        var method = ''
        method = methodName+'('
        for(var i = 0 ;i< methodArgs.length;i++){
            method += methodArgs[i]
            if( i != methodArgs.length-1)
                method += ','
        }
        method += ')'
        list.push(method);
    }catch(e){
        util.logger.error(agentSetting.currentTestRun +' | Error in concateMethodName :',e)
    }
}

module.exports = autoDiscovery;