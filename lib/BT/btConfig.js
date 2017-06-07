/**
 * Created by Siddhant on 25-09-2016.
 */

var util = require('../util');
var threshold = require('./threshold');
var btManager = require('./btManager');
var agentSetting = require('../agent-setting');
var btGlobalRule = require('./btGlobalRule');
var btPatternRule = require('./btPatternRule');
var patternBased = require('./patternBasedBT');
var samples = require('../nodetime/lib/samples');
var fs = require('fs');
var path = require('path');

var INDEX_SLOW = 1;
var INDEX_VERY_SLOW = 2;
//macros for dynamic slow/vslow threshold
var INDEX_DNY_ENABLE = 3;
var INDEX_DNY_SLOW_PCT = 4;
var INDEX_DNY_VERY_SLOW_PCT = 5;
var DEFAULT_VALUE_SLOW_THRESOLD = 3 * 1000;
var DEFAULT_VALUE_VERY_SLOW_THRESOLD = 5 * 1000;
var DEFAULT_NAME_FOR_ALL_URI = "All";
var btId = 1;

function btConfig (){
    //this.isPatternBasedRulePresnt = false;
};

btConfig.resetBtId = function(){
    btId = 1;
};

btConfig.isPatternBasedRulePresnt = false;

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
                if (fileName[j].length == 0 || (fileName[j].startsWith("#")) || (fileName[j].startsWith(" "))) {
                  //util.logger.warn(Server.TestRunIDValue,"","","Invalid line found, so ignoring.");
                  continue;
                }
                var eachFields;
                eachFields = fileName[j].split("|");
                if (eachFields.length < 3) {
                    //util.logger.warn(Server.TestRunIDValue,"","","Invalid line found, so ignoring. CurrentLine : " + currLine);
                    continue;
                }

                try {
                    var btName = eachFields[0].toString().trim();
                    var slowThresold = parseInt(eachFields[INDEX_SLOW].toString());
                    var verySlowThresold = parseInt(eachFields[INDEX_VERY_SLOW].toString());
                    var dynamicSlowThresoldPct = 0;
            	    var dynamicVSlowThresoldPct = 0;
            	    var dynamicThresoldMethod = 0;
                    if(eachFields.length == 6){
	                    dynamicSlowThresoldPct = parseInt(eachFields[INDEX_DNY_SLOW_PCT].toString());
	            	    dynamicVSlowThresoldPct = parseInt(eachFields[INDEX_DNY_VERY_SLOW_PCT].toString());
	            	    dynamicThresoldMethod = parseInt(eachFields[INDEX_DNY_ENABLE].toString());
                    }
                    //invalid line
                    if (slowThresold >= verySlowThresold) {
                        //if (NDBTMonitor.getBtMonitorTraceLevel() > 1)
                        //util.logger.warn(Server.TestRunIDValue,"","","SlowThresold could not be greater or equal to verySlowThresoold, so ignoring cureent line : " + currLine + " slowValue : " + slowThresold + " verySlow : " + verySlowThresold);
                        continue;
                    }

                    //TODO - runtime if using default
                    var thresholdObj = new threshold(slowThresold, verySlowThresold, dynamicThresoldMethod, dynamicSlowThresoldPct, dynamicVSlowThresoldPct);
                    var btThreashold = btManager.getBtObj(btName);

                    if (!btThreashold) {
                        if (DEFAULT_NAME_FOR_ALL_URI.toUpperCase() == btName.toUpperCase())
                            btManager.insertBTInThresholdMap('0', DEFAULT_NAME_FOR_ALL_URI.toUpperCase(), thresholdObj);
                        else
                            btManager.insertBTInThresholdMap(null, btName, thresholdObj);
                    }
                }

                catch (err) {
                    util.logger.error(agentSetting.currentTestRun + " | Unable to configureThreasoldValues properly... " + err);
                }
            }
    }catch(err){
       util.logger.warn(err);
    }
};


btConfig.parseNamingRulesForBT = function(fileName){
    try {
        for(var j in fileName) {
            var linesOfCurrentRuleFile = fileName[j];

            if (fileName[j].length == 0 || (fileName[j].toString().trim().startsWith("#")) || (fileName[j].toString().trim().startsWith(" "))) {
                //util.logger.warn(Server.TestRunIDValue,"","","Invalid line found, so ignoring.");
                continue;
            }
            if (null == linesOfCurrentRuleFile.length)
                return false;

            if (linesOfCurrentRuleFile.startsWith("1")) {
                btGlobalRule.parseGlobal(linesOfCurrentRuleFile);
            }
            else if (linesOfCurrentRuleFile.startsWith("7")) {
                //If staeMachine is enable than parse file with previous procedure.
                if(!agentSetting.enableStateMC) {
                    btConfig.isPatternBasedRulePresnt = true;
                    btPatternRule.parsePattern(linesOfCurrentRuleFile);
                }else {
                    if (btConfig.isPatternBasedRulePresnt) {
                        patternBased.generatePatternBasedBTStateMachine(fileName);
                        break;
                    } else {
                        btConfig.isPatternBasedRulePresnt = true;
                        patternBased.generatePatternBasedBTStateMachine(fileName);
                        break;
                    }
                }
            }
        }
        if(btConfig.isPatternBasedRulePresnt) {
            btId = 1                                    //Resetting BTID to 1 "BT Mode is changing to PatternBasedRulePresnt so resetting counter"
            var btObjAll,thresholdObj;
            btObjAll = btManager.getThresholdObj("ALL");
            thresholdObj = btObjAll ? btObjAll.threshold : threshold.getDefaultThreshold();
            btManager.insertBT(0, 'ALL', thresholdObj)
            btManager.insertBT(1, 'Others', thresholdObj)
            this.dumpAllBt(btManager.getBtList())             //Getting list of all BT
        }

    }catch(err){
        util.logger.warn(err);
    }
};

//return BT Name
btConfig.executeBTRule = function(req){
    try {
        var btName,
            btObj,
            id;
        if (btConfig.isPatternBasedRulePresnt) {
                btObj = btPatternRule.executeRulesAndReturnBTName(req);
        } else {
            btName = btGlobalRule.executeRulesAndReturnBTName(req);
            btObj = btManager.getBtObj(btName);
            /*For every new req, btObject will be null and btid is nullin case Btname is provided from threshold file*/
            if (!btObj || !btObj.btId) {
                if(btId >= agentSetting.maxBTCount){      //Checking for Bt limit , if btid exceeds maximum limit , then it will be count as "Other"
                    btName = 'Others';
                    id=1;
                    btObj = btManager.getBtObj('Others');
                }
                else
                    id = ++btId;

                if(!btObj) {                               /*getting threshold object for current BT*/
                    var btObjAll = btManager.getBtObj("ALL"),
                        thresholdObj;
                    if (!btObjAll)
                        thresholdObj = threshold.getDefaultThreshold();
                    else
                        thresholdObj = btObjAll.threshold;
                    btObj = btManager.insertBT(id, btName, thresholdObj);
                }
                else if(!btObj.btId){
                    btManager.insertID(btName, id);
                }
                if(!btObj.isMetadataDumped) {           //Checkings , is MetaData for current req is dumped or not , if not then enabling flag true
                    btManager.dumpBt(id, btName)
                    btObj.isMetadataDumped = true
                }
            }
        }
    }catch(err){
        util.logger.warn(err);
    }
    return btObj;
};

btConfig.dumpAllBt = function(btNameMap){
    var keys = Object.keys(btNameMap)
    var resetBtRecord = "11," + (new Date().getTime() - agentSetting.cavEpochDiff * 1000) + ",7\n";
    if(agentSetting.dataConnHandler) {
        samples.add(resetBtRecord);
        util.logger.info(agentSetting.currentTestRun, "| Resetting BT, sending bt meta record : ", resetBtRecord)
    }
    for (var i in keys){
        var str = '7,' + btNameMap[keys[i]].btId + "," + btNameMap[keys[i]].btName + "\n";
        if(agentSetting.dataConnHandler)
            samples.add(str);
        if(btNameMap[keys[i]].btName.toUpperCase() !== 'ALL')
            btManager.createAndUpdateBTRecord(btNameMap[keys[i]].btId,btNameMap[keys[i]].btName,undefined,"","","","");//If BT object is not created then create it at once

        if(agentSetting.enableBTMonitorTrace > 0)
            util.logger.info(agentSetting.currentTestRun,' | Dumping BT 7 Record : ',str)
    }
}

module.exports = btConfig;