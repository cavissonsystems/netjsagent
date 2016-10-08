/**
 * Created by Harendra Kumar on 10/3/2016.
 */

var keywordName;
var fileName;
var size;
var lmd;
var util = require('./util');
var agentSetting = require("./agent-setting");
function NDKeywordFileModel() {

}

NDKeywordFileModel.ndKeywordFileModel = function(keywordName,encodedKeywordValue){
    try {
        var keywordRecieved = decodeURIComponent(encodedKeywordValue);
        util.logger.info(agentSetting.currentTestRun+" | Keyword received : "+keywordName)

        //parsing the decoded keyword received.
        var newFileName = parseKeywordFields(keywordRecieved);
        return newFileName;
    }catch(err){util.logger.warn(err)}
}
function  parseKeywordFields(keywordValue)
{
    //splitting keyword value.
    try {
        var allFields = keywordValue.split(";");
        for (var i = 0; i < allFields.length; i++) {
            if (i == 0) {
                fileName = allFields[0];
            }
            else {
                var keywithValue = allFields[i].split("=");
                if ("size" == keywithValue[0].trim().toString()) {
                    size = Number(keywithValue[1]);
                }
                if ("lmd" == keywithValue[0].trim().toString()) {
                    lmd = Number(keywithValue[1]);
                }
            }
        }
        return fileName;
    }catch(err){util.logger.warn(err)}
}

module.exports = NDKeywordFileModel;