/**
 * Created by Siddhant on 25-09-2016.
 */

var util = require('../util');
var threshold = require('./threshold');
var btManager = require('./btManager');
var agentSetting = require('../agent-setting');
var btGlobalRule = require('./btGlobalRule');
var btPatternRule = require('./btPatternRule');
var ndBtMetaData = require('../metaData/ndBTMetaData');
var fs = require('fs');
var path = require('path');
var btObject = require('./btObj');

var INDEX_SLOW = 1;
var INDEX_VERY_SLOW = 2;
var DEFAULT_VALUE_SLOW_THRESOLD = 3 * 1000;
var DEFAULT_VALUE_VERY_SLOW_THRESOLD = 5 * 1000;
var DEFAULT_NAME_FOR_ALL_URI = "All";
var btId = 1;
var btRuleFileArr = [];
var btRuleFile = 0;
var btThresholdFileArr = [];
var btThresholdFile = 0;

function btConfig (){
    this.isPatternBasedRulePresnt = false;
};

btConfig.parseThresholdFile = function(clientMsg){
    try {
        btConfig.parseBtThreshold(clientMsg);
    }
    catch (err) {
        util.logger.warn(err)
    }

}


btConfig.parseBTRuleConfigfile = function(clientMsg){
    try {
        btConfig.parseNamingRulesForBT(clientMsg);
    }
    catch (err) {
        util.logger.warn(err)
    }
}

btConfig.parseBtThreshold = function(fileName){
    try {

        for(var j = 0; j<fileName.length; j++) {
            var allLinesOfThresoldConfigFile = fileName[j];
            for (var i = 0; i < allLinesOfThresoldConfigFile.length; i++) {

                if (allLinesOfThresoldConfigFile[i].length == 0 || (allLinesOfThresoldConfigFile[i].startsWith("#")) || (allLinesOfThresoldConfigFile[i].startsWith(" "))) {
                    //util.logger.warn(Server.TestRunIDValue,"","","Invalid line found, so ignoring.");
                    continue;
                }
                var eachFields;

                eachFields = allLinesOfThresoldConfigFile[i].split("|");

                if (eachFields.length < 3) {
                    //util.logger.warn(Server.TestRunIDValue,"","","Invalid line found, so ignoring. CurrentLine : " + currLine);
                    continue;
                }

                try {
                    var btName = eachFields[0].toString().trim();
                    var slowThresold = parseInt(eachFields[INDEX_SLOW].toString());
                    var verySlowThresold = parseInt(eachFields[INDEX_VERY_SLOW].toString());

                    //invalid line
                    if (slowThresold >= verySlowThresold) {
                        //if (NDBTMonitor.getBtMonitorTraceLevel() > 1)
                        //util.logger.warn(Server.TestRunIDValue,"","","SlowThresold could not be greater or equal to verySlowThresoold, so ignoring cureent line : " + currLine + " slowValue : " + slowThresold + " verySlow : " + verySlowThresold);
                        continue;
                    }

                    //TODO - runtime if using default
                    var thresholdObj = new threshold(slowThresold, verySlowThresold);
                    var btThreashold = btManager.getBtObj(btName);

                    if (null == btThreashold) {
                        btManager.insertBT(null, btName, thresholdObj);
                    }

                    if (DEFAULT_NAME_FOR_ALL_URI.toUpperCase() == btName.toUpperCase()) {
                        var defaultThresholdObj = new threshold(DEFAULT_VALUE_SLOW_THRESOLD, DEFAULT_VALUE_VERY_SLOW_THRESOLD);
                        btManager.insertBT('0', DEFAULT_NAME_FOR_ALL_URI, defaultThresholdObj);
                        btManager.insertBT('1', 'Others', defaultThresholdObj);
                    }
                }
                catch (err) {
                    util.logger.error(agentSetting.currentTestRun + " | Unable to configureThreasoldValues properly... " + err);
                }
            }
        }
    }catch(err){
       util.logger.warn(err);
    }
};


btConfig.parseNamingRulesForBT = function(fileName){
    try {

        for(var j = 0; j<fileName.length; j++) {
            var linesOfCurrentRuleFile = fileName[j];

            if (null == linesOfCurrentRuleFile.length)
                return false;

            //var isPatternBasedRulePresnt = false;
            for (var i in linesOfCurrentRuleFile) {

                if (linesOfCurrentRuleFile[i].startsWith("1")) {
                    btGlobalRule.parseGlobal(linesOfCurrentRuleFile[i]);
                }
                /*else if (currLine.startsWith("2"))
                 {
                 NDBTRuleBean objNdbtRuleBean = parseCustomRule(currLine);
                 if (null != objNdbtRuleBean)
                 tmpCustomRules.add(objNdbtRuleBean);
                 }
                 else if (currLine.startsWith("3"))
                 {
                 NDBTRuleBean objNdbtRuleBean = parseCustomRule(currLine);
                 if (null != objNdbtRuleBean)
                 tmpExclusionRules.add(objNdbtRuleBean);
                 }*/
                //else if(currLine.startsWith("4") || currLine.startsWith("5") || currLine.startsWith("7"))
                else if (linesOfCurrentRuleFile[i].startsWith("7")) {
                    if (!btConfig.isPatternBasedRulePresnt)
                        btConfig.isPatternBasedRulePresnt = true;

                    btPatternRule.parsePattern(linesOfCurrentRuleFile[i]);
                    //this is just to ensure pattern based design is on.

                }
            }
        }
    }catch(err){
        util.logger.warn(err);
    }
};

//return BT Name
btConfig.executeBTRule = function(req){
    try {
        var btName;
        var btObj;
        if (btConfig.isPatternBasedRulePresnt) {
            btObj = btPatternRule.executeRulesAndReturnBTName(req);
        } else {
            btName = btGlobalRule.executeRulesAndReturnBTName(req);
            btObj = btManager.getBtObj(btName);

            if (btObj == null) {
                btId = btId + 1;
                var thresholdObj = threshold.getDefaultThreshold();
                btManager.insertBT(btId, btName, thresholdObj);
                btObj = btManager.getBtObj(btName);
            }else if (btObj.btId == null) {
                btId = btId + 1;
                btManager.insertID(btName, btId);

            }
        }
    }catch(err){
        util.logger.warn(err);
    }
    return btObj;
};

module.exports = btConfig;