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
var multiInstrProfCount = 1;
var multiInstrProfCount1 = 0;
var util = require('./util');

function instrProfileParser()
{}

instrProfileParser.processInstrFileList = function (clientMsg,clientSocket) {

    try {
        var allFields = clientMsg;

        var profilefield = [];
        for (var i = 0; i < allFields.length; i++) {
            if (allFields[i].toString().startsWith("InstrProfile=") || allFields[i].toString().indexOf("InstrProfile=/") != -1 || allFields[i].toString().startsWith("instrProfile=") || allFields[i].toString().indexOf("instrProfile=/") != -1) {
                profilefield = allFields[i].toString().split("=");
                instrumentationProfiles.push(profilefield[1]);
            }
        }
        clientSocket.write("nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[0].toString() + "" + '\n');
        util.logger.info(agentSetting.currentTestRun+" | nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[0].toString() + "" + '\n');
        multiInstrProfCount1 = instrumentationProfiles.length - 1;
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

                for (var i = 0; i < jsn.length; i++) {
                    instrProfMap[jsn[i].modulename] = jsn[i];
                }
                if (instrumentationProfiles.length > 1 && multiInstrProfCount < instrumentationProfiles.length) {

                    clientSocket.write("nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[multiInstrProfCount].toString() + "" + '\n');
                    util.logger.info(agentSetting.currentTestRun+" | nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[multiInstrProfCount].toString() + "" + '\n');
                    multiInstrProfCount++;
                }
                else {
                    // All instrumentation has been received .
                    multiInstrProfCount = 0;
                    var modules = Object.keys(instrProfMap);
                    /*for (var i in modules) {
                     for (var j in builtinCoreModules) {
                     if (modules[i] == builtinCoreModules[j]) {
                     if (modules[i] != 'path')
                     agentSetting.coreModuleList.push(modules[i])

                     delete instrProfMap[modules[i]]
                     }
                     }
                     }*/
                    agentSetting.coreModuleList = instrProfMap;

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

    if(module in instrProfMap){
        //TODO:Handle  instrumneting
    }
}
module.exports = instrProfileParser;