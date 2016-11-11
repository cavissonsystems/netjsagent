/**
 * Created by Siddhant on 26-09-2016.
 */

var util = require('../util');
var fs = require('fs');
var Regex = require("regex");
var path = require('path');
var requestMap = new Object();
var btId = 0;
var agentSetting = require('../agent-setting');
var samples = require('../nodetime/lib/samples.js');
var btManager = require('./btManager');
var threshold = require('./threshold');
var btRuleList = [];
var btObj = require('./btObj');
function btPatternRule (){

};

/*btPatternRule.executeRulesAndReturnBTName = function(req) {

    //var btObject;
    var ruleObj;
    var url = req['url'];

    /!*if (requestMap[url] == undefined)
    {*!/
        try {
            /!*if(!fs.existsSync(process.cwd(),'/BtRuleFile'))
            {

                btId = btId + 1;
                samples.add('7,' + btId + "," + url + "\n");

                requestMap[url] = btId ;
            }
            else {*!/
            ruleObj = btPatternRule.matchData(url);
            /!*!//console.log("ruleObj is : " + ruleObj);
            if(ruleObj != undefined) {
                btObj = btManager.getBtObj(ruleObj.btName);
                requestMap[url] = btObj.btName;
            }

            /!*if(ruleObj == undefined){
                threshold = threshold.getDefaultThreshold();
                btName = "Others";
                requestMap[url] = btName;
                samples.add('7,' + '0' + "," + btName + "\n");
                btManager.insertBT(0, btName, threshold);
                btObj = btManager.getBtObj("Others");

            }*!/
            if(ruleObj.btIncluMode == 0){
                if(btObj != undefined) {
                    samples.add('7,' + btObj.btId + "," + btObj.btName + "\n");
                    requestMap[url] = btObj.btName;
                }
            }else{
                return;
            }
            //}
        } catch (err) {
            util.logger.warn(agentSetting.currentTestRun + " | Error is "+err);
        }
    }
    else {
        btName = requestMap[url];
        btObj = btManager.getBtObj(btName);
    }*!/
        } catch (err) {
            util.logger.warn(agentSetting.currentTestRun + " | Error is "+err);
        }
    return ruleObj;
};*/

String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.indexOf(searchString, position) === position;
};

btPatternRule.clearList = function(){
    btRuleList = [];
}

btPatternRule.executeRulesAndReturnBTName = function(req)
{
    var btObject;
    var url = req['url'];
    try {
        var matched;
        for (var i = 0; i < btRuleList.length; i++) {
            var rule = btRuleList[i];
            if (rule.btMatchMode == 1) {
                    if (url.startsWith(rule.Pattern)) {
                        matched = rule;
                        break;
                    }
                } else if (rule.btMatchMode == 0) {

                    if (rule.RegEx.test(url)) {
                        matched = rule;
                        break;
                    }
                }
        }

        if(matched == undefined){
            btObject = new btObj('1', 'Others', threshold.getDefaultThreshold());
            //btObject = btObj.getOtherBT();
        }

        if(matched.btIncluMode == 0) {
            btObject = btManager.getBtObj(matched.btName);
        }
    }
    catch(err)
    {
        util.logger.warn(agentSetting.currentTestRun + " | Error is "+err);
    }
    return btObject;
};

btPatternRule.parsePattern = function(ruleLine) {
    try {
        var btConf = new Object();
        var dataValue = ruleLine.split("|");

        var urlPattern = dataValue[4];
        btConf.btName = dataValue[1];
        btConf.btId = dataValue[2];
        btConf.btMatchMode = dataValue[3];
        btConf.btIncluMode = dataValue[5];
        btConf.Pattern=urlPattern;
        btConf.RegEx = new Regex(urlPattern);
        btRuleList.push(btConf);

        var btObj;
        if(btConf.btIncluMode == 0) {
            btObj = btManager.getBtObj(btConf.btName);

            if (btObj == null) {
                var thresholdObj = threshold.getDefaultThreshold();
                btManager.insertBT(btConf.btId, btConf.btName, thresholdObj);
            }
            else if (btObj.btId == null) {
                btManager.insertID(btConf.btName, btConf.btId);
            }
        }
    } catch (err) {
        util.logger.warn(agentSetting.currentTestRun + " | Error is " + err);
        util.logger.warn(err);
    }
};

module.exports = btPatternRule;