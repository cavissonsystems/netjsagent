/**
 * Created by Siddhant on 05-09-2016.
 */

var lastSentMetadataTimeStamp;
var targetTimeStamp;
var allFieldsOfClientMessage = new Object();
var allRecords = new Object();
var typeOfRecord;
var destination;//0-current connection, 1- data connection, 2- both data and current condition
var traceLevel;//0-current connection, 1- data connection, 2- both data and current condition
var startIndex;//0-current connection, 1- data connection, 2- both data and current condition
var errorMessage;//0-current connection, 1- data connection, 2- both data and current condition
var stopSendingData;

var agentSetting = require('./../agent-setting');
var ndMethodMetaData = require('./ndMethodMetaData');
var ndBTMetaData = require('./ndBTMetaData');
var ndSQLMetaData = require('./ndSQLMetaData');
var sample = require('../nodetime/lib/samples');
var util = require('../util');



function ndMetaDataRecoveryProcess(){}

ndMetaDataRecoveryProcess.dump11Record = function(typeOfMetaRecord)
{
    var date = new Date();
    var current_time = date.getTime();
    var currTime = (current_time - agentSetting.cavEpochDiff * 1000);       //TODO agentSetting.cavEpochDiff in ms or seconds
    if(destination == 1)
    {
        var record = "11," + currTime + "," + typeOfMetaRecord + '\n';
        ndMetaDataRecoveryProcess.dumpOnDataConnection(record);
    }
    else if(destination > 1)
    {
        var record = "11," + currTime + "," + typeOfMetaRecord + '\n';
        ndMetaDataRecoveryProcess.dumpOnDataConnection(record);

    }
};

ndMetaDataRecoveryProcess.dumpOnDataConnection = function(record)
{
    sample.add(record);
};

ndMetaDataRecoveryProcess.processClientMessage = function(clientMsg, clientSocket){
    ndMetaDataRecoveryProcess.clearAllVars();
    ndMetaDataRecoveryProcess.parseCurrentRequestMessage(clientMsg, clientSocket);
    ndMetaDataRecoveryProcess.parseEachFieldOfAllRecords(clientMsg, clientSocket);

};

ndMetaDataRecoveryProcess.clearAllVars = function(){
    traceLevel = 0;
    targetTimeStamp = 0;
    allRecords = new Object();
    allFieldsOfClientMessage = new Object();
    typeOfRecord = "All";
    destination = 0;//0-current connection, 1- data connection, 2- both data and current condition
    startIndex = 0;
    errorMessage = new Object();
};

ndMetaDataRecoveryProcess.parseCurrentRequestMessage = function(clientMsg, clientSocket){
     //"nd_meta_data_req:action=send_meta_data;appName=Mew;ndAppServerHost=Mew;tierName=NodeJS;7;0"
    allFieldsOfClientMessage = clientMsg.split(";");

    if(allFieldsOfClientMessage.length > 6)
    {
        traceLevel = parseInt(allFieldsOfClientMessage[6].toString());
        destination = parseInt(allFieldsOfClientMessage[5].toString());
        var recordField = allFieldsOfClientMessage[4].toString();
        allRecords = recordField.split(",");
    }
    else if(allFieldsOfClientMessage.length > 5)
    {
        destination = parseInt(allFieldsOfClientMessage[5].toString());
        var recordField = allFieldsOfClientMessage[4].toString();
        allRecords = recordField.split(",");
    }
    else if(allFieldsOfClientMessage.length > 4)
    {
        destination = 0;
        var recordField = allFieldsOfClientMessage[4].toString();
        allRecords = recordField.split(",");
    }
    else if(clientMsg.startsWith("nd_meta_data_req:action=send_meta_data;"))
    {
        //Send all metadata
        destination = 0;
        ndMetaDataRecoveryProcess.handleAllMetaDataSending(clientSocket);
    }
    else
    {
        //TODO server.sendOutput("nd_meta_data_rep:action=send_meta_data;result=Error :<Invalid request received. Req. Message : " + clientMsg + ">.");
    }
};

ndMetaDataRecoveryProcess.handleAllMetaDataSending = function(clientSocket){
    ndMetaDataRecoveryProcess.dump11Record("All");
    ndMetaDataRecoveryProcess.sendCachedDataToNewClient(5, clientSocket);
    //ndMetaDataRecoveryProcess.collectAndSendOnlyCached6Records();
    ndMetaDataRecoveryProcess.sendCachedDataToNewClient(7,clientSocket);
    ndMetaDataRecoveryProcess.sendCachedDataToNewClient(21, clientSocket);
    /*ndMetaDataRecoveryProcess.collectAndSendOnlyCached32Records();
    ndMetaDataRecoveryProcess.collectAndSendOnlyCached33Records();
    ndMetaDataRecoveryProcess.collectAndSendOnlyCached34Records();
    ndMetaDataRecoveryProcess.collectAndSendOnlyCached35Records();
    ndMetaDataRecoveryProcess.collectAndSendOnlyCached41Records();*/
};


ndMetaDataRecoveryProcess.parseEachFieldOfAllRecords = function(clientMsg, clientSocket){

    if(allRecords.length > 1)
    {
        for(var i = 0; i < allRecords.length; i++)
        {
            typeOfRecord = allRecords[i].toString();
            ndMetaDataRecoveryProcess.handleCurrRecord(clientMsg, typeOfRecord, clientSocket);
        }
    }
    else if(allRecords.length == 1)
    {
        typeOfRecord = allRecords[0].toString();
        ndMetaDataRecoveryProcess.handleCurrRecord(clientMsg, typeOfRecord, clientSocket);
    }
    else
        util.logger.warn(agentSetting.currentTestRun + " | Invalid Request : " + clientMsg);

    //todo - what if both condition not matched?
};

ndMetaDataRecoveryProcess.sendSummaryReport = function(clientSocket){
    clientSocket.write("-------------------SummaryReport(CachedRecords)---------------------: \nTotal no. of instrumented Methods(5 Records) : " + Object.keys(ndMethodMetaData.methodMap).length + ", \nTotal Number of Cached URLs(7 Records) : " + Object.keys(ndBTMetaData.requestMap).length + ", \nTotal Number of cached NonPrepared SQL Query :" + Object.keys(ndSQLMetaData.nonPreparedQueryMap).length + "\n-------------------SummaryReport(CachedRecords)---------------------\n")

};

ndMetaDataRecoveryProcess.handleCurrRecord = function(clientMsg, typeOfRecordField, clientSocket){
    if(typeOfRecordField.startsWith("All"))
    {
        ndMetaDataRecoveryProcess.sendSummaryReport(clientSocket);
        ndMetaDataRecoveryProcess.handleAllMetaDataSending(clientSocket);
    }
    else if(typeOfRecordField.startsWith("Summary"))
    {
        ndMetaDataRecoveryProcess.sendSummaryReport(clientSocket);
    }
    else if(typeOfRecordField.startsWith("5"))
    {
        ndMetaDataRecoveryProcess.checkAndSendCachedRecord(5, typeOfRecordField, clientSocket);
    }
    else if(typeOfRecordField.startsWith("6"))
    {
        ndMetaDataRecoveryProcess.checkAndSendCachedRecord(6, typeOfRecordField);
    }
    else if(typeOfRecordField.startsWith("7"))
    {
        ndMetaDataRecoveryProcess.checkAndSendCachedRecord(7, typeOfRecordField);
    }
    else if(typeOfRecordField.startsWith("21"))
    {
        ndMetaDataRecoveryProcess.checkAndSendCachedRecord(21, typeOfRecordField);
    }
    else if(typeOfRecordField.startsWith("32"))
    {
        ndMetaDataRecoveryProcess.checkAndSendCachedRecord(32, typeOfRecordField);
    }
    else if(typeOfRecordField.startsWith("33"))
    {
        ndMetaDataRecoveryProcess.checkAndSendCachedRecord(33, typeOfRecordField);
    }
    else if(typeOfRecordField.startsWith("34"))
    {
        ndMetaDataRecoveryProcess.checkAndSendCachedRecord(34, typeOfRecordField);
    }
    else if(typeOfRecordField.startsWith("35"))
    {
        ndMetaDataRecoveryProcess.checkAndSendCachedRecord(35, typeOfRecordField);
    }
    else if(typeOfRecordField.startsWith("41"))
    {
        ndMetaDataRecoveryProcess.checkAndSendCachedRecord(41, typeOfRecordField);
    }
    //else
        //errorMessage.add("Invalid Request recieved from client : " + clientMessage);
        //errorMessage.add("Invalid Request recieved from client : " + clientMessage);
};

ndMetaDataRecoveryProcess.checkAndSendCachedRecord = function(recTpe, currrecord, clientSocket){
    //Summary:233322221
    //5:233322221
    //or 5_21:233322221
    //or 5_+21:233322221
    var index = 0;
    var isMultiple = false;
    var isSpecific = false;
    var indexOfColon = -1;

    if(currrecord.indexOf(':')>=0)
    {
        indexOfColon = currrecord.indexOf(":");
        targetTimeStamp = parseInt(currrecord.substring(indexOfColon + 1, currrecord.length));        //todo value can be in long
    }

    if(currrecord.indexOf('_')>=0)
    {
        isSpecific = true;

        if(currrecord.indexOf('+')>=0)
        {
            if(indexOfColon > -1)
                index = parseInt(currrecord.substring(currrecord.indexOf('+') + 1, indexOfColon));
            else
                index = parseInt(currrecord.substring(currrecord.indexOf('+') + 1, currrecord.length));

            isMultiple = true;
        }
        else
        {
            if(indexOfColon > -1)
                index = parseInt(currrecord.substring(currrecord.indexOf('_') + 1, indexOfColon));
            else
                index = parseInt(currrecord.substring(currrecord.indexOf('_') + 1, currrecord.length));

        }
    }

    if(isSpecific)
    {
        if((targetTimeStamp > 0) && (targetTimeStamp < lastSentMetadataTimeStamp))
        {
            util.logger.warn(agentSetting.currentTestRun + " | Wrong Timestamp : RecordField- " + currrecord + ". Paased timeStamp- " + targetTimeStamp + " ,Should be more than last sent metadata timestamp " + lastSentMetadataTimeStamp);
           // errorMessage.add("Wrong Timestamp : RecordField- " + currrecord + ". Paased timeStamp- " + targetTimeStamp + " ,Should be more than last sent metadata timestamp " + lastSentMetadataTimeStamp);
            return;
        }

        ndMetaDataRecoveryProcess.dump11Record(recTpe + "");
        ndMetaDataRecoveryProcess.findRecordTypeAndSendCachedData(index, recTpe, isSpecific, isMultiple, clientSocket);
    }
    else
    {
        if(targetTimeStamp == 0)
        {
            ndMetaDataRecoveryProcess.dump11Record(recTpe + "");
            ndMetaDataRecoveryProcess.findRecordTypeAndSendCachedData(index, recTpe, isSpecific, isMultiple);
        }
        else
        {
            if(targetTimeStamp >= lastSentMetadataTimeStamp)
            {
                ndMetaDataRecoveryProcess.dump11Record(recTpe + "");
                ndMetaDataRecoveryProcess.findRecordTypeAndSendCachedData(index, recTpe, isSpecific, true);
            }
            else
            {
                util.logger.warn(agentSetting.currentTestRun + " | Wrong Timestamp : RecordField- " + currrecord + ". Paased timeStamp- " + targetTimeStamp + " ,Should be more than last sent metadata timestamp " + lastSentMetadataTimeStamp);
               // errorMessage.add("Wrong Timestamp : RecordField- " + currrecord + ". Paased timeStamp- " + targetTimeStamp + " ,Should be more than last sent metadata timestamp " + lastSentMetadataTimeStamp);
                return;
            }
        }
    }
};

ndMetaDataRecoveryProcess.collectAndSendOnlyCached21Records = function(index, isSpecific, isMultiple, clientSocket){
    try {

        if (index != 0) {
            if (isSpecific && !isMultiple)
                ndMetaDataRecoveryProcess.sendCachedSpecificSingle21Record(23, index, clientSocket);       //for nonpreparedquery id is 23
            else
                ndMetaDataRecoveryProcess.sendCached21DataToNewClient(23, index, clientSocket);
        }
        else {
            ndMetaDataRecoveryProcess.sendCachedDataToNewClientForSQL(23, clientSocket);
        }
    }catch(err){
        util.logger.warn(agentSetting.currentTestRun + " | Error is "+err);
    }
};

ndMetaDataRecoveryProcess.sendCachedSpecificSingle21Record = function(rcType, index, clientSocket){
    var record = "na";
    var data = ndSQLMetaData.getNonPreparedKey(index);

    record = rcType + ",0," + data + "," + index + '\n';
    ndMetaDataRecoveryProcess.sendData(record, clientSocket);
};

ndMetaDataRecoveryProcess.sendCached21DataToNewClient = function(rcType, index, clientSocket){
    for(var i = 1; i<= index; i++){
        var record = "na";
        var val = ndSQLMetaData.getNonPreparedKey(i);
        record = rcType  + ",0," + i + "," + val + '\n';

        ndMetaDataRecoveryProcess.sendData(record, clientSocket);
    }

};

ndMetaDataRecoveryProcess.sendCachedDataToNewClientForSQL = function(rcType, clientSocket){
    var data = ndSQLMetaData.getAll();
    for(var i = 0; i<data.length; i++){
        ndMetaDataRecoveryProcess.sendData(data[i], clientSocket);
    }
};

ndMetaDataRecoveryProcess.collectAndSendOnlyCached7Records = function(index, isSpecific, isMultiple, clientSocket){
    try {
        if (index != 0) {
            if (isSpecific && !isMultiple)
                ndMetaDataRecoveryProcess.sendCachedSpecificSingle7Record(7, index, clientSocket);
            else
                ndMetaDataRecoveryProcess.sendCachedDataToNewClientFor7Rec(7, index, clientSocket);
        }
        else
            ndMetaDataRecoveryProcess.sendCachedDataFor7RecToNewClient(7, clientSocket);
    }catch(err){
        util.logger.warn(agentSetting.currentTestRun + " | Error is "+err);
    }
};

ndMetaDataRecoveryProcess.sendCachedDataToNewClientFor7Rec = function(j, index, clientSocket){
    for(var i = 1; i<= index; i++){
        var record = "na";
        var val = ndBTMetaData.getKey(i);
        record = j  + "," + i + "," + val + '\n';

        ndMetaDataRecoveryProcess.sendData(record, clientSocket);
    }
};

ndMetaDataRecoveryProcess.sendCachedDataFor7RecToNewClient = function(j, clientSocket){
    var data = ndBTMetaData.getAll();
    for(var i = 0; i<data.length; i++){
        ndMetaDataRecoveryProcess.sendData(data[i], clientSocket);
    }
};

ndMetaDataRecoveryProcess.sendCachedSpecificSingle7Record = function(rcType, index, clientSocket){
    var isRecordFound = false;
    var i = 0;

        var record = "na";
        var val = ndBTMetaData.getKey(index);

            record = rcType + "," + index  + "," + val + '\n';
            ndMetaDataRecoveryProcess.sendData(record, clientSocket);
            isRecordFound = true;

    if(!isRecordFound) {
        util.logger.warn(agentSetting.currentTestRun + " | No cached element found in " + 7 + " record, for specified index : " + index);
       // errorMessage.add("No cached element found in " + 7 + " record, for specified index : " + index);
    }
};


ndMetaDataRecoveryProcess.findRecordTypeAndSendCachedData = function(index, recTpe, isSpecific, isMultiple, clientSocket){

    switch (recTpe)
    {
        case 5:
            ndMetaDataRecoveryProcess.collectAndSendOnlyCached5Records(index, isSpecific, isMultiple, clientSocket);
            break;
        case 6:
            ndMetaDataRecoveryProcess.collectAndSendOnlyCached6Records(index, isSpecific, isMultiple);
            break;
        case 7:
            ndMetaDataRecoveryProcess.collectAndSendOnlyCached7Records(index, isSpecific, isMultiple, clientSocket);
            break;
        case 21:
            ndMetaDataRecoveryProcess.collectAndSendOnlyCached21Records(index, isSpecific, isMultiple, clientSocket);
            break;
        case 32:
            ndMetaDataRecoveryProcess.collectAndSendOnlyCached32Records(index, isSpecific, isMultiple);
            break;
        case 33:
            ndMetaDataRecoveryProcess.collectAndSendOnlyCached33Records(index, isSpecific, isMultiple);
            break;
        case 34:
            ndMetaDataRecoveryProcess.collectAndSendOnlyCached34Records(index, isSpecific, isMultiple);
            break;
        case 35:
            ndMetaDataRecoveryProcess.collectAndSendOnlyCached35Records(index, isSpecific, isMultiple);
            break;
        case 41:
            ndMetaDataRecoveryProcess.collectAndSendOnlyCached41Records(index, isSpecific, isMultiple);
            break;
        default:
            break;
    }
};

ndMetaDataRecoveryProcess.collectAndSendOnlyCached5Records = function(index, isSpecific, isMultiple, clientSocket) {
    try {
        if (index != 0) {
            if (isSpecific && !isMultiple)
                ndMetaDataRecoveryProcess.sendCachedSpecificSingleRecord(5, index, clientSocket);
            else
                ndMetaDataRecoveryProcess.sendCachedDataToNewClient(5, index, clientSocket);
        }
        else {
            ndMetaDataRecoveryProcess.sendCachedDataToNewClient(5, clientSocket);
        }
    }catch(err){
        util.logger.warn(agentSetting.currentTestRun + " | Error is "+err);
    }
};

ndMetaDataRecoveryProcess.sendCachedDataToNewClient = function(rcType, index, clientSocket)
{
    for (var i = 1; i <= index; i++) {
        var record = "na";
        var val = ndMethodMetaData.getKey(i);
        record = j + "," + i + "," + val + '\n';
        ndMetaDataRecoveryProcess.sendData(record, clientSocket);
    }
};

ndMetaDataRecoveryProcess.sendCachedDataToNewClient = function(rcType, clientSocket){
    var i = 1;
    if(rcType == '5') {
        var meta = ndMethodMetaData.getAll();
        for(var i = 0; i<meta.length; i++){
            ndMetaDataRecoveryProcess.sendData(meta[i], clientSocket);
        }

    }else if(rcType == '7'){
        var meta = ndBTMetaData.getAll();
        for(var i = 0; i<meta.length; i++){
            ndMetaDataRecoveryProcess.sendData(meta[i], clientSocket);
        }
    }else if(rcType == '21'){
        var meta = ndSQLMetaData.getAll();
        for(var i = 0; i<meta.length; i++){
            ndMetaDataRecoveryProcess.sendData(meta[i], clientSocket);
        }
    }
};

ndMetaDataRecoveryProcess.sendCachedSpecificSingleRecord = function(rcType, index, clientSocket){

        var record = "na";

        var data = ndMethodMetaData.getKey(index);
        record = rcType + "," + data + "," + index + '\n';
        ndMetaDataRecoveryProcess.sendData(record, clientSocket);
};

ndMetaDataRecoveryProcess.sendData = function(record, clientSocket){
    if(destination == 0)
        clientSocket.write(record);
    else if(destination == 1)
        sample.add(record);
    else if(destination > 1)
    {
        clientSocket.write(record);
        sample.add(record);
    }
};





module.exports = ndMetaDataRecoveryProcess;