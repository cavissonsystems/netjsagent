/**
 * Created by Sahil on 22-09-2015.
 */

var agentSetting = require('../agent-setting');
var backendDetails = require('./backendDetails');
var util = require ('../util');
var samples = require('../nodetime/lib/samples.js');
var ndMetaData = require('../metaData/ndMethodMetaData');
var ndBackendNameFileMap = new Object();

function backendRecord(){}
function setCharAt(str,index,chr) {
    if(index > str.length-1) return str;
    return str.substr(0,index) + chr + str.substr(index+1);
}
function escapeHTMLForBackendNames(backendName){
    try{
        for(var i in backendName.length){
            var c = backendName.charAt(i)
            switch (c){
                case ' ':setCharAt(backendName,i,'-')
                    break;;
                case '\n':setCharAt(backendName,i,'-')
                    break;
            }
        }
        return backendName;
    }
    catch(err){
        util.logger.warn("Error in escapeHTMLForBackendNames : ",err);
    }
}

function getBackendName(host,port){

    //if(NDBackendMonitor.getBackendMonTraceLevel() > 1)
    try{
        if(agentSetting.enableBackendMonTrace > 1)
            util.logger.info(agentSetting.currentTestRun,' |GetBackendName is called in case of backendCallNamingRules found null. Hence generating backend name based on host and port. host: ' , host ,' port: ' ,port);
        // NDListener.logBCITrace(Server.TestRunIDValue, "", "","getBackendName is called in case of backendCallNamingRules found null. Hence generating backend name based on host and port. host: " + host + " port: " + port);
        var backendName='';
        if(!host)
            backendName += "Localhost"
        else
            backendName += host

        if(!port || port < 0)
            backendName +='';
        else
            backendName += '_' + port;
        if(agentSetting.enableBackendMonTrace > 1)
            util.logger.info(agentSetting.currentTestRun,' |Returning vector name : ', backendName);
        //if(NDBackendMonitor.getBackendMonTraceLevel() > 1)
        //    NDListener.logBCITrace(Server.TestRunIDValue, "", "","Returning vector name : " + backendName);
        return escapeHTMLForBackendNames(backendName);
    }
    catch(err) {
        util.logger.warn('Error in Getting BackendName : ', err)
    }
}

backendRecord.parseBackendPointsNamingInfo = function(backendRuleList){
	try{
    if(backendRuleList && backendRuleList.length > 0) {
        for(var i =0; i< backendRuleList.length; i++) {
            var content = backendRuleList[i].split("\|");
            if(content.length > 1) {
                var rule = content[1].split(',')
                ndBackendNameFileMap[content[0].toUpperCase()] = rule;
            }
        }
    }
	if(agentSetting.enableBackendMonTrace > 1)
		util.logger.info(agentSetting.currentTestRun,' |Rule According to Backend Rule File is : ',rule);
    }
    catch(err){
	util.logger.warn('Error in Parsing Backend Name : ',err)
	}									   
}

backendRecord.generateBackendName=function(prefix,host,port,query){
    return prefix+'_'+this.createBackendNameAccRule(prefix,host,port,query)
}

backendRecord.createBackendNameAccRule=function(prefix,host,port,query) {
    try {
        var namingRules = ndBackendNameFileMap[prefix.toUpperCase()]
        if (!namingRules) {
            return getBackendName(host, port)
        }
        var backendName = '';
        for (var rule in namingRules) {
            //if(NDBackendMonitor.getBackendMonTraceLevel() > 1)
            //    NDListener.logBCITrace(Server.TestRunIDValue, "", "","Current rule is " + rule);
            if (agentSetting.enableBackendMonTrace > 1)
                util.logger.info(agentSetting.currentTestRun, ' |Current rule is ', rule);
            if (namingRules[rule].toUpperCase() == "URL") {
                backendName += host + '_'
            }
            else if (namingRules[rule].toUpperCase() == "HOST") {
                if (!host)
                    host = "Localhost";

                backendName += host + '_';
            }
            else if (namingRules[rule].toUpperCase() == "PORT") {
                if (!port || port < 0)
                    port = ("NA");

                backendName += port + '_';
            }
            else if (namingRules[rule].toUpperCase() == "QUERY") {
                if (query)
                    backendName += query + '_'
            }
        }
        backendName = backendName.substring(0, backendName.length - 1)
        if (agentSetting.enableBackendMonTrace > 1)
            util.logger.info(agentSetting.currentTestRun, ' |Returning vector name : ', backendName);
        //if(NDBackendMonitor.getBackendMonTraceLevel() > 1)
        //    NDListener.logBCITrace(Server.TestRunIDValue, "", "","Returning vector name : " + backendName);
        return escapeHTMLForBackendNames(backendName);
    }
    catch (err) {
        util.logger.warn('Error in createBackendNameAccRule : ', err)
    }
}

backendRecord.handleBackendRecord = function(status,duration,backendName,tierCall) {
    try{
        var netReqDelay = -1;
        var netResDelay = -1;
        if(tierCall) {
            netReqDelay = tierCall.networkDelayInRequest;
            netResDelay = tierCall.networkDelayInResponse;
        }
        if(agentSetting.backendRecordMap[backendName] == undefined){
            util.logger.info(agentSetting.currentTestRun+" | Creating backend monitoring record for : "+backendName);
            backendRecord.createBackendRecord(status,duration,backendName,netReqDelay,netResDelay);
        }else {
            backendRecord.updateBackendRecord(status,duration,backendName,netReqDelay,netResDelay);
        }
    }catch(err){
        util.logger.warn('Error in handleBackendRecord :',err);
    }
}

backendRecord.createBackendRecord = function(status,duration,backendName,netReqDelay,netResDelay){
    try{
        var backend = new backendDetails();

        agentSetting.backendID = agentSetting.backendID + 1;
        backend.createBackendRecord(status,duration,backendName,agentSetting.backendID,netReqDelay,netResDelay);
        agentSetting.backendRecordMap[backendName] = backend;
    }
    catch(err){
	util.logger.warn('Error in Creating Backend Name',err)
    }		    
}

backendRecord.updateBackendRecord = function (status,duration,backendName,netReqDelay,netResDelay) {
    try{
        var backDetails = agentSetting.backendRecordMap[backendName];
        backDetails.updateBackendDetails(status,duration,netReqDelay,netResDelay);
    }
    catch(err){
		util.logger.warn('Error in updating Backend Name : ',err)
    }
}

backendRecord.clearBackendRuleList=function(){
    ndBackendNameFileMap = new Object();
}


module.exports = backendRecord;

