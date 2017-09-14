/**
 * Created by Harendra Kumar on 10/3/2016.
 */


var util = require('./util');
var agentSetting = require("./agent-setting");

function NDKeywordFileModel() {
    this.keywordName = null;
    this.size;
    this.lmd;
    this.keyword;
}

NDKeywordFileModel.prototype.ndKeywordFileModel = function(keywordName,encodedKeywordValue){
    try {
        if(!encodedKeywordValue)
            return;
        var keywordRecieved = decodeURIComponent(encodedKeywordValue);
        this.keywordName = keywordName;
        util.logger.info(agentSetting.currentTestRun+" | Keyword received : "+keywordName)

        //parsing the decoded keyword received.
        this.parseKeywordFields(keywordRecieved);

    }catch(err){util.logger.warn(err)}
}
NDKeywordFileModel.prototype.parseKeywordFields = function(keywordValue)
{
    //splitting keyword value.
    try {
        var allFields = keywordValue.split(";");
        for (var i = 0; i < allFields.length; i++) {
            if (i == 0) {
                this.fileName = allFields[0];
            }
            else {
                var keywithValue = allFields[i].split("=");
                if ("size" == keywithValue[0].trim().toString()) {
                    this.size = Number(keywithValue[1]);
                }
                if ("lmd" == keywithValue[0].trim().toString()) {
                    this.lmd = Number(keywithValue[1]);
                }
            }
        }
    }catch(err){util.logger.warn(err)}
}

module.exports = NDKeywordFileModel;