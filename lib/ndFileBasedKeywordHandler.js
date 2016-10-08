/**
 * Created by Harendra Kumar on 9/30/2016.
 */

var ndKeywordFileModelObj = require('./ndKeywordFileModel');
var agentSetting = require("./agent-setting");
var util = require('./util');
//var ndMethMonFileParse = require('./ndMethodMonitorFileParsing');
var ndMthMonitor = require('./method-monitor/ndMethodMonitor.js')
var keywordName = null;
var size;
var lmd;
var keyword;
function NDFileBasedKeywordHandler()
{

}

NDFileBasedKeywordHandler.parseFileBasedKeywords = function(clientMsg, clientSocket) {
    try {
        var allFields = clientMsg;

        for (var i = 0; i < allFields.length; i++) {
            if (allFields[i].toString().startsWith("ndMethodMonFile=")) {
                keywordName = "ndMethodMonFile";
                getFileContent(allFields[i], clientSocket, keywordName);
            }
            else if (allFields[i].toString().startsWith("ndBackendNamingRulesFile=")) {

                keywordName = "ndBackendNamingRulesFile";
                getFileContent(allFields[i], clientSocket, keywordName);
            }
            else if (allFields[i].toString().startsWith("ndMethodMonFile=") && (allFields[i].toString().indexOf("ndMethodMonFile=NA;") != -1)) {

            }
            else if (allFields[i].toString().startsWith("ndMethodMonFile=") && (allFields[i].toString().indexOf("ndMethodMonFile=NA;") != -1)) {

            }
            else if (allFields[i].toString().startsWith("ndMethodMonFile=") && (allFields[i].toString().indexOf("ndMethodMonFile=NA;") != -1)) {

            }
            else if (allFields[i].toString().startsWith("ndMethodMonFile=") && (allFields[i].toString().indexOf("ndMethodMonFile=NA;") != -1)) {

            }
            else if (allFields[i].toString().startsWith("ndMethodMonFile=") && (allFields[i].toString().indexOf("ndMethodMonFile=NA;") != -1)) {

            }
            else if (allFields[i].toString().startsWith("ndMethodMonFile=") && (allFields[i].toString().indexOf("ndMethodMonFile=NA;") != -1)) {

            }
        }
    }
    catch(err)
    {util.logger.warn(err)}
}

function getFileContent(allFields,clientSocket,keywordName)
{
    var fileContent = [];
    var KeywithValue = [];

    try
    {
        KeywithValue = allFields.split("=");
        var newFileName = ndKeywordFileModelObj.ndKeywordFileModel(keywordName,KeywithValue[1]);
        compareAndGetFileContents(keywordName,clientSocket);
    }
    catch (err) {
        util.logger.warn(err);
    }
}
function compareAndGetFileContents(keywordName, clientSocket) {
    sendMessageToGetNewFileContent(keywordName, clientSocket);

}
function sendMessageToGetNewFileContent(keywordName, clientSocket)
{
    try {

        // Sending message for retrieving new file.
        clientSocket.write("nd_control_req:action=send_file;keyword="+keywordName+";" + '\n');
        util.logger.info(agentSetting.currentTestRun+" | nd_control_req:action=send_file;keyword="+keywordName+";" + '\n');
        //read file from socket.
        //readFileContent(clientSocket, serverThread);
    }
    catch (err) {
        util.logger.warn(err);
    }
}
NDFileBasedKeywordHandler.readFileContent = function (clientMsg) {
    try {
        var allFields = [];
        var KeywithValue = [];

        clientMsg = decodeURIComponent(clientMsg);
        util.logger.info(agentSetting.currentTestRun+" | "+clientMsg)
        allFields = clientMsg.split(";");

        if(allFields[0].toString().trim().startsWith("keyword="))
        {
            KeywithValue = allFields[0].toString().split("=");
            if("keyword" == (KeywithValue[0]))
            {
                keyword = KeywithValue[1];
            }

            KeywithValue = allFields[1].toString().split("=");
            if("size" == (KeywithValue[0]))
            {
                size = Number(KeywithValue[1]);
            }

            KeywithValue = allFields[2].toString().split("=");
            if("lmd" == (KeywithValue[0]))
            {
                lmd = KeywithValue[1];
            }
        }
        var mthObj = {"keywordName":keyword,"size":size,"lmd":lmd};
        return mthObj;
    }
    catch (err) {
        util.logger.warn(err);
    }
}
/**
 * This Method is parsing the fileMetadata received before the actual file
 * @param clientMsg
 */

NDFileBasedKeywordHandler.setFileContent = function(clintMsg){

    try {
        if (keyword == "ndMethodMonFile") {
            util.logger.info(agentSetting.currentTestRun + " | Reading method monitor file");
            // ndMethMonFileParse.parseAndSetFileContents(clintMsg);
            ndMthMonitor.parseMethodMonitor(clintMsg);
        }
        else if (keyword == "ndBackendNamingRulesFile") {
        }
    }
    catch(err)
    {
        util.logger.warn(err)
    }

}
module.exports = NDFileBasedKeywordHandler;