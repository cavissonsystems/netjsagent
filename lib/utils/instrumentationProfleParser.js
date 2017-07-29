/**
 * Created by Sahil on 5/1/17.
 */

var builtinCoreModules = [ 'assert','buffer','child_process','cluster','crypto','dgram','dns','domain','events','fs','http','https','net','os','path','punycode','querystring', 'readline','stream','string_decoder','tls','tty','url','util','vm','zlib','smalloc' ];
var instrProfMap = {},runTimeInstrProfMap = {};
var coreInstrProfMap = {};
var ndMethodMetaData = require('../metaData/ndMethodMetaData')
var util = require('../util')
var fs = require('fs')

function instrumentationProfleParser(){}

instrumentationProfleParser.parseInstrFile = function(instrData){
    try {
        /*Parsing instrumentation profile and adding it into 2 maps . 1-instrProfMap that will send to njstrace
         * 2- coreInstrProfMap, that will instrument by nodetime */
        for (var i in instrData) {
            instrProfMap[instrData[i].modulename] = instrData[i];
            for (j in builtinCoreModules) {
                if (instrData[i].modulename === builtinCoreModules[j]) {
                    delete instrProfMap[instrData[i].modulename];
                    coreInstrProfMap[instrData[i].modulename] = instrData[i];
                }
            }
        }
    }
    catch(err){
        util.logger.error("Error in instrumentationProfleParser.parseInstrFile : ",err)
    }
}

instrumentationProfleParser.parseRunTimeInstrumentationProfile = function(list){
    if(list)jsn = JSON.parse(list);

    for (var i in jsn) {
        runTimeInstrProfMap[jsn[i].modulename] = jsn[i];
    }
    //transformModules();
}
function transformModules() {
    try {
        for (var module in runTimeInstrProfMap) {
            if (runTimeInstrProfMap[module].modulename == '**/*.js' || runTimeInstrProfMap[module].modulename == '**/node_modules/**')
                continue
            var moduleName = process.cwd() + module.replace(/[**]/g, '') //transforming **/node_modules/** --> /home/nsecom-master/node_modules
            if (module.charAt(module.length - 1) == '*') {
                var listOfFiles = [];
                var readFile = function (moduleName, list, callback) {
                    var files = fs.readdirSync(moduleName)
                    list = list || []
                    for (var i in files) {
                        if (fs.statSync(moduleName + '/' + files[i]).isDirectory())
                            list = readFile(moduleName + files[i] + '/', list);
                        else if (files[i].endsWith('.js'))
                            list.push([moduleName + files[i], runTimeInstrProfMap[module].instrument])
                    }
                    return (list);
                }
                listOfFiles = readFile(moduleName, listOfFiles, valiateAndInstrument)
                valiateAndInstrument(listOfFiles)
            }
            else if (moduleName.endsWith('.js')) {
                valiateAndInstrument([[moduleName, runTimeInstrProfMap[module].instrument]])
            }
        }
    }
    catch(err){util.logger.error("Error in instrumentationProfleParser.parseInstrFile : ",err)}
}
instrumentationProfleParser.instrumentedModulesFromNodetime={}
function valiateAndInstrument(moduleName){
    if(!Array.isArray(moduleName)) moduleName = [moduleName];
    moduleName.forEach(function(module){
        if(module && module[0].indexOf('async-listener') == -1 && fs.existsSync(module[0])) {
            var flag = util.instrumentedModules[module[0]]
            if (!flag && instrumentationProfleParser.instrumentedModulesFromNodetime[module[0]] !==  module[1]) {
                instrumentationProfleParser.instrumentedModulesFromNodetime[module[0]] = module[1];
                require('../nodetime/lib/traceProbe')(module)
            }
        }
    })
}

instrumentationProfleParser.findModuleInInstrProfile = function(module){
    if(module === ['http' || 'pg' || 'memcache' || 'redis' || 'mongodb'])
        return false;

    var moduleData = instrProfMap[module]
    var coreData = coreInstrProfMap[module]

    if((moduleData  && moduleData.instrument == true) ||( coreData && coreData.instrument == true)) //(coreData.instrument == true || moduleData.instrument == true) ) {
    {
        //util.logger.warn("Core module is to be instrumented : ",module)
        return true;
    }
    else
        return false;
}

instrumentationProfleParser.getInstrMap = function () {
    return instrProfMap;
}

module.exports = instrumentationProfleParser;
