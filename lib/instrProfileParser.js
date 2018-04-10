/**
 * Created by Harendra Kumar on 9/29/2016.
 * purpose:Parsing instrument profile, and maintaining a hashMap.
 */

var instrumentationProfiles = [];                               //Array for all instrumentationProfiles , conatin all instrumentationProfiles
var fileBasedKeyword = [];                                      //Array for all fileBasedKeyword , conatin all files
var list = [];                                                  //tis is an array that can store each file data

var btManager = require('./BT/btManager.js')
var btRuleList = require('./BT/btPatternRule.js') ;
var btGlobalRule = require ('./BT/btGlobalRule.js');
var btConfig = require('./BT/btConfig');

var agentSetting= require("./agent-setting");
var ndMthMonitor = require('./method-monitor/ndMethodMonitor.js');
var ndExceptionMonitor = require('./exception/ndExceptionMonitor'),
    backendRecord = require('./backend/backendRecord'),
    NDHttpConditionStats = require('./HttpHeader/NDHttpConditionStats'),
    NDSessionCaptureSettings = require('./HttpHeader/NDSessionCaptureSettings'),
    instrumentationProfileParser = require('./njstrace/instrumentationProfleParser'),
    ndKeywordFileModelObj = require('./ndKeywordFileModel'),
    entryPonitManager = require('./utils/NDEntryPointManager');
var instProfMsg = "";
var builtinCoreModules = [ 'assert','buffer','child_process','cluster','crypto','dgram','dns','domain','events','fs','http','https','net','os','path','punycode','querystring', 'readline','stream','string_decoder','tls','tty','url','util','vm','zlib','smalloc' ];
var instPrfCount = 0;
var instrProfMap ={},keyWordModel= new Object();
var coreInstrProfMap = {};
var keywordName = null;
var multiInstrProfCount = 1;                    //Counter for instrumentation profile , should be start from 1, because by default first instrumentation profile req send automatically
var multiFileKeywordCount = 0;                  //Counter for keywordbased file, should be start from 0
var util = require('./util');
var currKeyword;
var connTimeout = undefined

function instrProfileParser() {}

instrProfileParser.resetInstrListOnStart = function () {
    instrumentationProfiles = [];
    fileBasedKeyword = [];
    multiInstrProfCount = 1;
    multiFileKeywordCount = 0;
    clearTimeout(connTimeout);connTimeout = undefined
}

instrProfileParser.getInstrMap = function () {
    return instrProfMap;
}

instrProfileParser.removeFilebasedKeyword = function(keywordName) {
    delete keyWordModel[keywordName]
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
        util.logger.error(agentSetting.currentTestRun,'| Error in parseInstrProfile',err)
    }
}

function checkFileBasedKeywordAndMakeConn(clientSocket,makeDataAutoConnection){
    if(fileBasedKeyword.length && multiFileKeywordCount < fileBasedKeyword.length ) {
        currKeyword = fileBasedKeyword[multiFileKeywordCount].keywordName
        getFileContent(fileBasedKeyword[multiFileKeywordCount], clientSocket, currKeyword,makeDataAutoConnection)
    }
    else {
        currKeyword = "";                    // After all req send for all file,cleaning curr keyword name
        multiFileKeywordCount = 0;
        fileBasedKeyword = [];               //Clearing Array of all keywords based file
        if(!agentSetting.runTimeChange)
            instrProfileParser.sendRespAndMakeConn(clientSocket,makeDataAutoConnection)
        else if(agentSetting.runTimeChange){                 //runtime change will be true, if it is applied but file is same then we have to handle that case
            agentSetting.runTimeChange =false;
            try {
                if(clientSocket) {
                    clientSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
                    util.logger.info(agentSetting.currentTestRun + " | nd_control_rep:action=modify;result=Ok;" + '\n');
                }
            }
            catch(e){
                util.logger.error(agentSetting.currentTestRun,'| Error in parseInstrProfile',err)
            }
        }
    }
}

function getFileContent(allFields,clientSocket,keywordName,makeDataAutoConnection) {
    var oldModel = keyWordModel[keywordName];
    var fileContent = [];
    var KeywithValue ;

    try
    {
        KeywithValue = allFields.value && allFields.value.split("=");

        var newFileName = new ndKeywordFileModelObj();

        newFileName.ndKeywordFileModel(keywordName,KeywithValue[1]);

        keyWordModel[newFileName.keywordName] = newFileName;
        keyWordModel[newFileName.keywordName].settings = allFields;
        instrProfileParser.compareAndGetFileContents(oldModel,newFileName,clientSocket,makeDataAutoConnection,keyWordModel[newFileName.keywordName]);

    }
    catch (err) {
        util.logger.warn(err);
    }
}
instrProfileParser.compareAndGetFileContents = function(oldModel,newModel, clientSocket,makeDataAutoConnection,allFields) {
    try {
        var isChanged = false;
        if (!newModel) {
            util.logger.info(agentSetting.currentTestRun, " | File Info is not present for ", newModel.keywordName, ",So requesting for next keyword");
            multiFileKeywordCount++

            checkFileBasedKeywordAndMakeConn(clientSocket, makeDataAutoConnection)
            return;
        }

        if (oldModel) {
            if ((newModel.lmd != oldModel.lmd) || (newModel.size != oldModel.size) || (newModel.fileName != oldModel.fileName)) {
                isChanged = true;
                util.logger.info(agentSetting.currentTestRun, " | File Missmatched : lmd  prev :" + oldModel.lmd + " ,Size : " + oldModel.size + " ,Name : " + oldModel.fileName + "\n New file lmd : " + newModel.lmd + " ,Size : " + newModel.size + " ,Name : " + newModel.fileName);
            }
            else
                isChanged = false;
        }
        else
            isChanged = true;

        if (isChanged) {
            try {
                // Sending message for retrieving new file.
                if(newModel.keywordName == 'BTRuleConfig')
                    agentSetting.isdumpBtMetaData = true;
                util.logger.info(agentSetting.currentTestRun, " | File is different ", isChanged, "Requesting for File", newModel.keywordName);
                multiFileKeywordCount++
                allFields.settings.isReqSent = true;
                startTimer(allFields,clientSocket,makeDataAutoConnection)
                clientSocket.write("nd_control_req:action=send_file;keyword=" + newModel.keywordName + ";" + '\n');
                util.logger.info(agentSetting.currentTestRun + " | nd_control_req:action=send_file;keyword=" + newModel.keywordName + ";" + '\n');
            }
            catch (err) {
                util.logger.warn(err);
            }
        }
        else {
            util.logger.info(agentSetting.currentTestRun, " | File is same for keyword", newModel.keywordName, ": lmd  prev :" + oldModel.lmd + " ,Size : " + oldModel.size + " ,Name : " + oldModel.fileName + "\n New file lmd : " + newModel.lmd + " ,Size : " + newModel.size + " ,Name : " + newModel.fileName);
            multiFileKeywordCount++
            checkFileBasedKeywordAndMakeConn(clientSocket, makeDataAutoConnection)
        }
    }
    catch(e){
        agentSetting.runTimeChange=false
        util.logger.info(agentSetting.currentTestRun + " | exception in compareAndGetFileContents",e);
    }
}

instrProfileParser.readFileBasedKeywordContent = function (data,clientSocket,makeDataAutoConnection,comingKeyword) {
    try {
        if (comingKeyword && comingKeyword != currKeyword) {
            util.logger.info(agentSetting.currentTestRun + " | Data is reading for keyword ",comingKeyword, " and current keyword was ",currKeyword);
            connTimeout && clearTimeout(connTimeout);connTimeout = undefined;
            data=''
            if(keyWordModel[currKeyword] && keyWordModel[currKeyword].settings.isCritical) {
                util.logger.info(agentSetting.currentTestRun + " | Request for Critical file ",currKeyword," but get the response of non -critical file",comingKeyword," So ignoring this and again requesting for critical file");
                startTimer(keyWordModel[currKeyword], clientSocket, makeDataAutoConnection)
                return;
            }else{
                delete keyWordModel[currKeyword]
                checkFileBasedKeywordAndMakeConn(clientSocket,makeDataAutoConnection)
                return ;
            }
        }
        connTimeout && clearTimeout(connTimeout);connTimeout = undefined;
        list= data.split('\n');
        if (list.length) {
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
                NDSessionCaptureSettings.parseCustomData(list);
            }else if (currKeyword == "NDEntryPointsFile") {
                util.logger.info(agentSetting.currentTestRun + " | Reading NDEntryPointsFile file");
                entryPonitManager.parseEntryPointFile(list);
            }

            list = []

            checkFileBasedKeywordAndMakeConn(clientSocket,makeDataAutoConnection)
        }
    }
    catch (err) {
        agentSetting.runTimeChange=false
        util.logger.warn(err)
    }
}

function startTimer(allFields,clientSocket,makeDataAutoConnection){
    connTimeout=setTimeout(function () {
        if(allFields.settings.isCritical){
            util.logger.info(agentSetting.currentTestRun + " | Data is not coming of critical file - ",allFields.keywordName,", So breaking control connection.")
            allFields.settings.isReqSent = false;
            clientSocket.destroy();
            currKeyword = connTimeout = undefined;
            delete keyWordModel[allFields.keywordName]
            if(agentSetting.isdumpBtMetaData)
                agentSetting.isdumpBtMetaData = false
            return;
        }else{
            util.logger.info(agentSetting.currentTestRun + " | Data is not coming of file - ",allFields.keywordName);
            connTimeout=undefined;
            delete keyWordModel[allFields.keywordName]
            checkFileBasedKeywordAndMakeConn(clientSocket,makeDataAutoConnection);
        }
    },60000);
}

function setFileMetaData(keywordName,metadata,isCritical){
    return {
        keywordName:keywordName,
        value:metadata,
        isCritical:isCritical,
        isReqSent:false,
        isResReceived:false
    }
}
instrProfileParser.processInstrFileList = function (clientMsg,clientSocket,makeDataAutoConnection,isRunTimeChane) {

    try {
        instrProfileParser.resetInstrListOnStart()
        var allFields = clientMsg;

        var profilefield = [];
        for (var i = 0; i < allFields.length; i++) {
            if (allFields[i].toString().startsWith("InstrProfile=") || allFields[i].toString().indexOf("InstrProfile=/") != -1 || allFields[i].toString().startsWith("instrProfile=") || allFields[i].toString().indexOf("instrProfile=/") != -1) {
                profilefield = allFields[i].toString().split("=")[1];
                if(profilefield === '-' || profilefield.indexOf('.json') == -1) {
                    continue ;
                }

                instrumentationProfiles.push(profilefield);

                util.logger.info(instrumentationProfiles)
            }
            else if (allFields[i].toString().startsWith("BTRuleConfig=")) {
                keywordName = "BTRuleConfig";
                if(allFields[i].toString().indexOf("BTRuleConfig=NA") != -1){
                    btGlobalRule.clearGlobalObj();
                    btConfig.isPatternBasedRulePresnt = false;
                    btManager.clear();
                    btRuleList.clearList();
                    btConfig.resetBtId();
                    instrProfileParser.removeFilebasedKeyword('BTRuleConfig')
                    continue ;
                }
                fileBasedKeyword.push(setFileMetaData(keywordName,allFields[i],true))
            }
            else if (allFields[i].toString().startsWith("BTTConfig=")) {

                if(allFields[i].toString().indexOf("BTTConfig=NA") != -1) {
                    btManager.clearthresholdmap();
                    instrProfileParser.removeFilebasedKeyword('BTTConfig')
                    continue;
                }

                keywordName = "BTTConfig";
                fileBasedKeyword.push(setFileMetaData(keywordName,allFields[i],false))
            }
            else if (allFields[i].toString().startsWith("ndMethodMonFile=")) {
                keywordName = "ndMethodMonFile";

                if(allFields[i].toString().indexOf("ndMethodMonFile=NA") != -1) {
                    ndMthMonitor.clearMMList();
                    instrProfileParser.removeFilebasedKeyword('ndMethodMonFile')
                    continue;
                }
                fileBasedKeyword.push(setFileMetaData(keywordName,allFields[i],false))
            }
	        else if (allFields[i].toString().startsWith("ndExceptionMonFile=")) {
                keywordName = "ndExceptionMonFile";

                if(allFields[i].toString().indexOf("ndExceptionMonFile=NA") != -1) {

                    ndExceptionMonitor.clearExceptionMonList()
                    instrProfileParser.removeFilebasedKeyword('ndExceptionMonFile')
                    continue;
                }
                fileBasedKeyword.push(setFileMetaData(keywordName,allFields[i],false))
            }
            else if(allFields[i].trim().startsWith('ndBackendNamingRulesFile') && (allFields[i].indexOf("ndBackendNamingRulesFile=NA") === -1)) {

                keywordName = 'ndBackendNamingRulesFile';
                fileBasedKeyword.push(setFileMetaData(keywordName,allFields[i],false))
            }
            else if(allFields[i].trim().startsWith("HTTPStatsCondCfg=") && (allFields[i].indexOf("HTTPStatsCondCfg=NA") === -1)){
                keywordName = 'HTTPStatsCondCfg';
                fileBasedKeyword.push(setFileMetaData(keywordName,allFields[i],false))
            }
            else if(allFields[i].trim().startsWith("captureCustomData=") && (allFields[i].indexOf("captureCustomData=NA") === -1)){
                keywordName = 'captureCustomData';
                fileBasedKeyword.push(setFileMetaData(keywordName,allFields[i],false))
            }
            else if(allFields[i].trim().startsWith("NDEntryPointsFile=") && (allFields[i].indexOf("NDEntryPointsFile=NA") === -1)) {
                keywordName = 'NDEntryPointsFile';
                fileBasedKeyword.push(setFileMetaData(keywordName,allFields[i],false))
            }
        }
        /*To continue on error,invalid file sent by ndc,their is a timeout that will send start_instrumenattion message and
        * create connection */

        /*if(!agentSetting.runTimeChange && !connTimeout) {
            connTimeout = setTimeout(function () {
                util.logger.info(agentSetting.currentTestRun + " | Creating connection after timeout")
                instrProfileParser.sendRespAndMakeConn(clientSocket, makeDataAutoConnection)
            },agentSetting.startInstrResTimeout)
        }*/
        if(instrumentationProfiles.length) {
            try {
                if (clientSocket) {
                    clientSocket.write("nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[0].toString() + "" + '\n');
                    util.logger.info(agentSetting.currentTestRun + " | nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[0].toString() + "" + '\n');
                }
            } catch(err){
                util.logger.error('Cant able to write on contol socket',err)
            }
        }
        else if(!instrumentationProfiles.length && fileBasedKeyword.length && multiFileKeywordCount < fileBasedKeyword.length)
        {
            currKeyword = fileBasedKeyword[multiFileKeywordCount].keywordName
            getFileContent(fileBasedKeyword[multiFileKeywordCount], clientSocket, currKeyword,makeDataAutoConnection)
        }else{
            if(agentSetting.runTimeChange){
                try{
                    agentSetting.runTimeChange=false;
                    if (clientSocket) {
                        clientSocket.write("nd_control_rep:action=modify;result=Ok;" + '\n');
                        util.logger.info(agentSetting.currentTestRun + " | nd_control_rep:action=modify;result=Ok;" + '\n');
                    }
                } catch(err){
                    agentSetting.runTimeChange=false;
                    util.logger.error('Cant able to write on contol socket',err)
                }
            }
            else if(!agentSetting.runTimeChange)
                instrProfileParser.sendRespAndMakeConn(clientSocket,makeDataAutoConnection)
        }
    }
    catch(err){
        agentSetting.runTimeChange=false
        util.logger.warn(err)}
}

instrProfileParser.processInstrFile = function (list,clientSocket,makeDataAutoConnection) {

    try {
        if(list && list.length)
            process.nextTick(function() {try { instrumentationProfileParser.parseRunTimeInstrumentationProfile(list) }catch(E){util.logger.error("Error in Run time instrumentaion",E)}})

        if (instrumentationProfiles.length && multiInstrProfCount < instrumentationProfiles.length) {
            try {
                if (clientSocket) {
                    clientSocket.write("nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[multiInstrProfCount].toString() + "" + '\n');
                    util.logger.info(agentSetting.currentTestRun + " | nd_control_req:action=send_instrumentation_profile;status=200;instrProfile=" + instrumentationProfiles[multiInstrProfCount].toString() + "" + '\n');
                }
            } catch(err){
                util.logger.error('Cant able to write on contol socket',err)
            }
            multiInstrProfCount++;
        }
        else{
            // All instrumentation has been received .Cleaning all values
            instrumentationProfiles = []
            multiInstrProfCount = 1;

            checkFileBasedKeywordAndMakeConn(clientSocket,makeDataAutoConnection)
        }
    }
    catch (err) {
        agentSetting.runTimeChange=false
        util.logger.warn(err)
    }
}

instrProfileParser.sendRespAndMakeConn =  function(clientSocket,makeDataAutoConnection){
    if(agentSetting.isTestRunning &&!agentSetting.dataConnHandler && !agentSetting.autoSensorConnHandler){

        util.logger.info(agentSetting.currentTestRun + " | Invoking Data , Auto connection and sending start_instr response")

        if(!agentSetting.startInstrResponse) {
            try {
                if (clientSocket) {
                    clientSocket.write("nd_control_rep:action=start_instrumentation;status=" + agentSetting.status + ";result=Ok;" + '\n')
                    util.logger.info(agentSetting.currentTestRun + " | nd_control_rep:action=start_instrumentation;status=" + agentSetting.status + ";result=Ok;" + '\n')
                }
            }
            catch(err){
                util.logger.error('Cant able to write on contol socket',err)
            }
            agentSetting.startInstrResponse = true;
            clearTimeout(connTimeout);connTimeout = undefined
            makeDataAutoConnection();
        }
        agentSetting.isToInstrument = true;
    }
    else{
        agentSetting.runTimeChange=false
        clearTimeout(connTimeout);connTimeout = undefined
        util.logger.warn(agentSetting.currentTestRun + " |Agent is already connected, So ignoring to avoid making of data and auto connections")
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
