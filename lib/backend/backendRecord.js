/**
 * Created by Siddhant on 22-09-2015.
 */

var agentSetting = require('../agent-setting');
var backendDetails = require('./backendDetails');
var util = require ('../util');
var samples = require('../nodetime/lib/samples.js');
var ndMetaData = require('../metaData/ndMethodMetaData');

function backendRecord(){

}

backendRecord.handleBackendRecord = function(args,duration,backendName) {
    if(agentSetting.backendRecordMap[backendName] == undefined){
        util.logger.info(agentSetting.currentTestRun+" | Creating backend monitoring record for : "+backendName);
        backendRecord.createBackendRecord(args,duration,backendName);
    } else {
        backendRecord.updateBackendRecord(args,duration,backendName);
    }
}

backendRecord.createBackendRecord = function(args,duration,backendName){
    var backend = new backendDetails();
    agentSetting.backendID = agentSetting.backendID + 1;
    backend.createBackendRecord(args,duration,backendName,agentSetting.backendID);
    agentSetting.backendRecordMap[backendName] = backend;

}

backendRecord.updateBackendRecord = function (args,duration,backendName) {
    var backDetails = agentSetting.backendRecordMap[backendName];
    backDetails.updateBackendDetails(args,duration);
}


module.exports = backendRecord;