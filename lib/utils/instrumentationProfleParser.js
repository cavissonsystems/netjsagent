/**
 * Created by Sahil on 5/1/17.
 */

var builtinCoreModules = [ 'assert','buffer','child_process','cluster','crypto','dgram','dns','domain','events','fs','http','https','net','os','path','punycode','querystring', 'readline','stream','string_decoder','tls','tty','url','util','vm','zlib','smalloc' ];
var instrProfMap = {};
var coreInstrProfMap = {};

function instrumentationProfleParser(){}

instrumentationProfleParser.parseInstrFile = function(data){
    try {
        var instrData = JSON.parse(data);

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
        console.log(err)
    }
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