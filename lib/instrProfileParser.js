/**
 * Created by Harendra Kumar on 9/29/2016.
 * purpose:Parsing instrument profile, and maintaining a hashMap.
 */

var instrumentationProfiles = [];
var njstrace = require('../lib/njstrace/njsTrace');
var agentSetting= require("./agent-setting");


var instProfMsg = "";
var builtinCoreModules = [ 'assert','buffer','child_process','cluster','crypto','dgram','dns','domain','events','fs','http','https','net','os','path','punycode','querystring', 'readline','stream','string_decoder','tls','tty','url','util','vm','zlib','smalloc' ];
var instPrfCount = 0;
var instrProfMap = {};
var coreInstrProfMap = {};
var multiInstrProfCount = 1;
var util = require('./util');

function instrProfileParser()
{}

instrProfileParser.resetInstrListOnStart = function () {
    instrumentationProfiles = [];
}

instrProfileParser.getInstrMap = function () {
    return instrProfMap;
}

instrProfileParser.parseInstrProfile = function(data){
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

instrProfileParser.processInstrFileList = function (clientMsg,clientSocket) {

    try {
        var allFields = clientMsg;

        var profilefield = [];
        for (var i = 0; i < allFields.length; i++) {
            if (allFields[i].toString().startsWith("InstrProfile=") || allFields[i].toString().indexOf("InstrProfile=/") != -1 || allFields[i].toString().startsWith("instrProfile=") || allFields[i].toString().indexOf("instrProfile=/") != -1) {
                profilefield = allFields[i].toString().split("=")[1];
                if(profilefield === '-') {
                    continue ;
                }

                instrumentationProfiles.push(profilefield);

                util.logger.info(instrumentationProfiles)
            }
        }
        if(instrumentationProfiles.length) {
            clientSocket.write("nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[0].toString() + "" + '\n');
            util.logger.info(agentSetting.currentTestRun + " | nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[0].toString() + "" + '\n');
        }
    }
    catch(err){util.logger.warn(err)}
}

instrProfileParser.processInstrFile = function (clientMsg,clientSocket) {
    try {
        if (instPrfCount > 0) {
            instProfMsg += clientMsg;
            if (clientMsg.indexOf("}]") != -1) {
                instPrfCount = 0;
                var jsn = JSON.parse(instProfMsg);
                instProfMsg = "";
                var preModules = Object.keys(instrProfMap);
                for (var i = 0; i < jsn.length; i++) {
                    var matched = false ;
                    for(j in preModules) {
                        if (preModules[j] === jsn[i].modulename)
                            matched = true;
                    }

                    if(!matched)
                        instrProfMap[jsn[i].modulename] = jsn[i];
                }

                if (instrumentationProfiles.length && multiInstrProfCount < instrumentationProfiles.length) {
                    clientSocket.write("nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[multiInstrProfCount].toString() + "" + '\n');
                    util.logger.info(agentSetting.currentTestRun+" | nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[multiInstrProfCount].toString() + "" + '\n');
                    multiInstrProfCount++;
                }
                else {
                    instrumentationProfiles = []
                    // All instrumentation has been received .
                    multiInstrProfCount = 1;
                    /*for (var i in modules) {
                     for (var j in builtinCoreModules) {
                     if (modules[i] == builtinCoreModules[j]) {
                     if (modules[i] != 'path')
                     agentSetting.coreModuleList.push(modules[i])

                     delete instrProfMap[modules[i]]
                     }
                     }
                     }*/

                }
            }

        }

        else if (clientMsg.toString().trim().indexOf('[{') > -1) {
            instProfMsg += clientMsg;
            instPrfCount++;
        }
    }
    catch (err) {
        util.logger.warn(err)
    }
}
instrProfileParser.findModuleInInstrProfile = function(module){
    if(module === ['http' || 'pg' || 'memcache' || 'redis' || 'mongodb'])
        return false;

    var moduleData = instrProfMap[module]
    var coreData = coreInstrProfMap[module]

    if((moduleData  && moduleData.instrument == true) ||( coreData && coreData.instrument == true)) //(coreData.instrument == true || moduleData.instrument == true) ) {
    {
        util.logger.warn("Core module is to be instrumented : ",module)
        return true;
    }
    else
        return false;
}
module.exports = instrProfileParser;