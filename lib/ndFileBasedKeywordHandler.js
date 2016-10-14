/**
 * Created by Harendra Kumar on 9/30/2016.
 */

var ndKeywordFileModelObj = require('./ndKeywordFileModel');
var agentSetting = require("./agent-setting");
var btManager = require('./BT/btManager.js')
var util = require('./util');
var btRuleList = require('./BT/btPatternRule.js') ;
var ndMthMonitor = require('./method-monitor/ndMethodMonitor.js');
var btGlobalRule = require ('./BT/btGlobalRule.js');
var btConfig = require('./BT/btConfig');
var keywordName = null;
var size;
var lmd;
var keyword;
var newFileBasedKeyword = null;
var isNewFileExist = -1;
var keyWordModel = new Object();
function NDFileBasedKeywordHandler()
{

}
NDFileBasedKeywordHandler.clearFileMap = function(ndMethodMonFile)
{
    delete keyWordModel[ndMethodMonFile]
}

NDFileBasedKeywordHandler.parseFileBasedKeywords = function(clientMsg, clientSocket) {
    try {
        var allFields = clientMsg;

        for (var i = 0; i < allFields.length; i++) {
            newFileBasedKeyword = null;
            isNewFileExist = -1;

            if (allFields[i].toString().startsWith("ndMethodMonFile=")) {
                keywordName = "ndMethodMonFile";

                if(allFields[i].toString().indexOf("ndMethodMonFile=NA") != -1) {
                    this.clearFileMap(keywordName);
                    ndMthMonitor.clearMMList();
                    continue;
                }

                var oldModel = keyWordModel[keywordName];
                getFileContent(allFields[i],oldModel, clientSocket, keywordName);
            }

            else if (allFields[i].toString().startsWith("BTRuleConfig=")) {
                keywordName = "BTRuleConfig";
                if(allFields[i].toString().indexOf("BTRuleConfig=NA") != -1){
                    this.clearFileMap(keywordName);
                    btGlobalRule.clearGlobalObj();
                    btConfig.isPatternBasedRulePresnt = false;
                    btManager.clear();

                    btRuleList.clearList();
                    continue ;
                }
                var oldModel = keyWordModel[keywordName];

                getFileContent(allFields[i],oldModel, clientSocket, keywordName);
            }

            else if (allFields[i].toString().startsWith("BTTConfig=")) {

                if(allFields[i].toString().indexOf("BTTConfig=NA") != -1)
                    continue ;

                keywordName = "BTTConfig";
                var oldModel = keyWordModel[keywordName];

                getFileContent(allFields[i],oldModel, clientSocket, keywordName);
            }

            /*else if (allFields[i].toString().startsWith("ndBackendNamingRulesFile=")) {

                keywordName = "ndBackendNamingRulesFile";
                getFileContent(allFields[i], clientSocket, keywordName);
            }*/
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

function getFileContent(allFields,oldModel,clientSocket,keywordName)
{
    var fileContent = [];
    var KeywithValue ;

    try
    {
        KeywithValue = allFields.split("=");

        var newFileName = new ndKeywordFileModelObj();

        newFileName.ndKeywordFileModel(keywordName,KeywithValue[1]);

        keyWordModel[newFileName.keywordName] = newFileName;

        NDFileBasedKeywordHandler.compareAndGetFileContents(oldModel,newFileName,clientSocket);

    }
    catch (err) {
        util.logger.warn(err);
    }
}
NDFileBasedKeywordHandler.compareAndGetFileContents = function(oldModel,newModel, clientSocket) {
    var isChanged = false;

    if(oldModel) {
        if ((newModel.lmd != oldModel.lmd) || (newModel.size != oldModel.size) || (newModel.fileName != oldModel.fileName)) {
            isChanged = true;
            util.logger.info(agentSetting.currentTestRun," | File Missmatched : lmd  prev :" + oldModel.lmd + " ,Size : " + oldModel.size + " ,Name : "+oldModel.name +"\n New file lmd : "+newModel.lmd + " ,Size : " + newModel.size + " ,Name : "+newModel.name);
        }
       /* if(!isChanged)
        {
            if(newModel.size != oldModel.size)
            {
                console.log("Not equal size")
                /!* NDListener.logBCITrace(Server.TestRunIDValue, "", "", "size mismatch. prev :" + prevFile.getSize() + "\nNew : " + newFile.getSize());*!/
                isChanged = true;
            }
        }

        //comparing filename with new file.

        if(!isChanged)
        {
            if(newModel.fileName != oldModel.fileName)
            {
                console.log("filename is changed ");
                //NDListener.logBCITrace(Server.TestRunIDValue, "", "", "filename mismatch. prev :" + prevFile.getFileName() + "\nNew : " + newFile.getFileName());
                isChanged = true;
            }
        }*/
    }
    else
        isChanged = true;

    if(isChanged)
    {
        try {
            if(newModel.keywordName == "ndMethodMonFile") {
                ndMthMonitor.clearMMList();
            }
            else if(newModel.keywordName == "BTRuleConfig"){
                btManager.clear();
                btGlobalRule.clearGlobalObj();
                btRuleList.clearList();
                btConfig.isPatternBasedRulePresnt = false;
            }
           /* else if(newModel.keywordName == "BTTConfig"){
             //   btManager.clear();
            }*/

            // Sending message for retrieving new file.
            clientSocket.write("nd_control_req:action=send_file;keyword="+newModel.keywordName+";" + '\n');
            util.logger.info(agentSetting.currentTestRun+" | nd_control_req:action=send_file;keyword="+newModel.keywordName+";" + '\n');
        }
        catch (err) {
            util.logger.warn(err);
        }
        return 1;
    }
    else
        return 0;
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

NDFileBasedKeywordHandler.setFileContent = function(clientMsg){

    try {
        if (keyword == "ndMethodMonFile") {
            util.logger.info(agentSetting.currentTestRun + " | Reading method monitor file");
            ndMthMonitor.parseMethodMonitor(clientMsg);
        }
        else if (keyword == "BTTConfig") {
            btConfig.parseThresholdFile(clientMsg);
        }
        else if (keyword == "BTRuleConfig") {
            btConfig.parseBTRuleConfigfile(clientMsg);
        }
    }
    catch(err)
    {
        util.logger.warn(err)
    }

}
module.exports = NDFileBasedKeywordHandler;