/**
 * Created by Harendra Kumar on 9/29/2016.
 * purpose:Parsing instrument profile, and maintaining a hashMap.
 */

var instrumentationProfiles = [];                               //Array for all instrumentationProfiles , conatin all instrumentationProfiles
var fileBasedKeyword = [];                                      //Array for all fileBasedKeyword , conatin all files
var list = [];                                                  //tis is an array that can store each file data
var njstrace = require('../lib/njstrace/njsTrace');

var btManager = require('./BT/btManager.js')
var btRuleList = require('./BT/btPatternRule.js') ;
var btGlobalRule = require ('./BT/btGlobalRule.js');
var btConfig = require('./BT/btConfig');

var agentSetting= require("./agent-setting");
var ndMthMonitor = require('./method-monitor/ndMethodMonitor.js');
var ndExceptionMonitor = require('./exception/ndExceptionMonitor'),
    backendRecord = require('./backend/backendRecord'),
    NDHttpConditionStats = require('./HttpHeader/NDHttpConditionStats'),
    CaptureCustomData = require('./HttpHeader/CaptureCustomData');
var instProfMsg = "";
var builtinCoreModules = [ 'assert','buffer','child_process','cluster','crypto','dgram','dns','domain','events','fs','http','https','net','os','path','punycode','querystring', 'readline','stream','string_decoder','tls','tty','url','util','vm','zlib','smalloc' ];
var instPrfCount = 0;
var instrProfMap = {};
var coreInstrProfMap = {};
var keywordName = null;
var multiInstrProfCount = 1;                    //Counter for instrumentation profile , should be start from 1, because by default first instrumentation profile req send automatically
var multiFileKeywordCount = 0;                  //Counter for keywordbased file, should be start from 0
var util = require('./util');
var keyWordModel = new Object();
var currKeyword;
var fileBasedKeywordfirstRequestSend = false

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
instrProfileParser.clearFileMap = function(keyword)
{
    delete keyWordModel[keyword]
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
            else if (allFields[i].toString().startsWith("ndMethodMonFile=")) {
                keywordName = "ndMethodMonFile";

                if(allFields[i].toString().indexOf("ndMethodMonFile=NA") != -1) {
                    this.clearFileMap(keywordName);
                    ndMthMonitor.clearMMList();
                    continue;
                }
                fileBasedKeyword.push(keywordName)
            }
	        else if (allFields[i].toString().startsWith("ndExceptionMonFile=")) {
                keywordName = "ndExceptionMonFile";

                if(allFields[i].toString().indexOf("ndExceptionMonFile=NA") != -1) {
                    this.clearFileMap(keywordName);

                    ndExceptionMonitor.clearExceptionMonList()
                    continue;
                }
                fileBasedKeyword.push(keywordName)
            }

            else if (allFields[i].toString().startsWith("BTRuleConfig=")) {
                keywordName = "BTRuleConfig";
                if(allFields[i].toString().indexOf("BTRuleConfig=NA") != -1){
                    this.clearFileMap(keywordName);
                    btGlobalRule.clearGlobalObj();
                    btConfig.isPatternBasedRulePresnt = false;
                    btManager.clear();
                    btRuleList.clearList();
                    btConfig.resetBtId();
                    continue ;
                }

                fileBasedKeyword.push(keywordName)
            }

            else if (allFields[i].toString().startsWith("BTTConfig=")) {

                if(allFields[i].toString().indexOf("BTTConfig=NA") != -1)
                    continue ;

                keywordName = "BTTConfig";
                //var oldModel = keyWordModel[keywordName];
                fileBasedKeyword.push(keywordName)
            }
            else if(allFields[i].trim().startsWith('ndBackendNamingRulesFile') && (allFields[i].indexOf("ndBackendNamingRulesFile=NA") === -1)) {

                keywordName = 'ndBackendNamingRulesFile';
                fileBasedKeyword.push(keywordName)
            }
            else if(allFields[i].trim().startsWith("HTTPStatsCondCfg=") && (allFields[i].indexOf("HTTPStatsCondCfg=NA") === -1)){
                keywordName = 'HTTPStatsCondCfg';
                fileBasedKeyword.push(keywordName)
            }
            else if(allFields[i].trim().startsWith("captureCustomData=") && (allFields[i].indexOf("captureCustomData=NA") === -1)){
                keywordName = 'captureCustomData';
                fileBasedKeyword.push(keywordName)
            }
        }
        if(instrumentationProfiles.length) {
            clientSocket.write("nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[0].toString() + "" + '\n');
            util.logger.info(agentSetting.currentTestRun + " | nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[0].toString() + "" + '\n');
        }
        else if(!instrumentationProfiles.length && fileBasedKeyword.length)
        {
            multiFileKeywordCount = 1;
            currKeyword = fileBasedKeyword[0];
            clientSocket.write("nd_control_req:action=send_file;keyword="+fileBasedKeyword[0]+";" + '\n');
            util.logger.info(agentSetting.currentTestRun+" | nd_control_req:action=send_file;keyword="+fileBasedKeyword[0]+";" + '\n');
        }
    }
    catch(err){util.logger.warn(err)}
}

instrProfileParser.processInstrFile = function (clientMsg,clientSocket) {

    try {
        if (instPrfCount > 0 || list.length) {
            if(list.length) {
                list.push(clientMsg)
            }
            else if(instPrfCount > 0){
                instProfMsg += clientMsg;
            }

            if (clientMsg.indexOf("}]") != -1 || clientMsg.indexOf('#end') > -1) {

                if(clientMsg.indexOf('}]') !== -1){
                    instPrfCount = 0;
                    var jsn;
                    if(instProfMsg)
                        jsn = JSON.parse(instProfMsg);

                    instProfMsg = "";
                    var preModules = Object.keys(instrProfMap);
                    for (var i = 0; i < jsn.length; i++) {
                        var matched = false;
                        for (j in preModules) {
                            if (preModules[j] === jsn[i].modulename)
                                matched = true;
                        }
                        if (!matched)
                            instrProfMap[jsn[i].modulename] = jsn[i];
                    }
                }
                else if(clientMsg.indexOf('#end') !== -1) {
                    if(list.length) {
                        if (currKeyword == "ndMethodMonFile") {
                            util.logger.info(agentSetting.currentTestRun + " | Reading method monitor file");
                            ndMthMonitor.parseMethodMonitor(list);
                        }
    			        else if (currKeyword == "ndExceptionMonFile") {
                            util.logger.info(agentSetting.currentTestRun + " | Reading ExceptionMon file");
                            ndExceptionMonitor.parseExceptionMonitoringList(list);
                        }
                        else if (currKeyword == "BTTConfig") {
                            util.logger.info(agentSetting.currentTestRun + " | Reading BTTConfig file");
                            btConfig.parseThresholdFile(list);
                        }
                        else if (currKeyword == "BTRuleConfig") {
                            util.logger.info(agentSetting.currentTestRun + " | Reading BTRuleConfig file");
                            btConfig.parseBTRuleConfigfile(list);
                        }
                        else if (currKeyword == "ndBackendNamingRulesFile") {
                            util.logger.info(agentSetting.currentTestRun + " | Reading ndBackendNamingRulesFile file");
                            backendRecord.parseBackendPointsNamingInfo(list);
                        }else if (currKeyword == "HTTPStatsCondCfg") {
                            util.logger.info(agentSetting.currentTestRun + " | Reading HTTPStatsCondCfg file");
                            NDHttpConditionStats.manageAllSpecifiedConditions(list);
                        }else if (currKeyword == "captureCustomData") {
                            util.logger.info(agentSetting.currentTestRun + " | Reading captureCustomData file");
                            CaptureCustomData.parseCustomData(list);
                        }
                    }
                }
                list = []
                if (instrumentationProfiles.length && multiInstrProfCount < instrumentationProfiles.length) {
                    clientSocket.write("nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[multiInstrProfCount].toString() + "" + '\n');
                    util.logger.info(agentSetting.currentTestRun+" | nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[multiInstrProfCount].toString() + "" + '\n');
                    multiInstrProfCount++;
                }
                else{
                    // All instrumentation has been received .Cleaning all values
                    instrumentationProfiles = []
                    multiInstrProfCount = 1;

                    if(fileBasedKeyword.length && multiFileKeywordCount < fileBasedKeyword.length ) {
                        currKeyword = fileBasedKeyword[multiFileKeywordCount]
                        clientSocket.write("nd_control_req:action=send_file;keyword="+fileBasedKeyword[multiFileKeywordCount]+";" + '\n');
                        util.logger.info(agentSetting.currentTestRun+" | nd_control_req:action=send_file;keyword="+fileBasedKeyword[multiFileKeywordCount]+";" + '\n');
                        multiFileKeywordCount ++
                    }
                    else {
                        currKeyword = "";                    // After all req send for all file,cleaning curr keyword name
                        multiFileKeywordCount = 0;
                        fileBasedKeyword = [];               //Clearing Array of all keywords based file
                    }
                }
            }

        }
        else if (clientMsg.toString().trim().indexOf('[{') !== -1 ) {
            instProfMsg += clientMsg;
            instPrfCount++;
        }
        else if( clientMsg.toString().trim().indexOf('#start') !== -1) {
                list.push(clientMsg)
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
