/**
 * Created by Siddhant on 26-09-2016.
 */

var btRuleBean = require('./btRuleBean');
var util = require('../util');
var agentSetting = require('../agent-setting');

function btGlobalRule (){

};

var globalRule = new btRuleBean();

btGlobalRule.parseGlobal = function(ruleLine) {
    try {
        var objNDBTRuleBean = new btRuleBean();
        objNDBTRuleBean.setRuleType(objNDBTRuleBean.GLOBAL_RULE_TYPE);
        var arrDefaultRule = ruleLine.split("|");
        var ruleMode = parseInt(arrDefaultRule[1]);
        objNDBTRuleBean.setRuleMode(ruleMode);

        if (arrDefaultRule[4] == "FromFirst") {
            objNDBTRuleBean.setIncludeUriInNameOrder(objNDBTRuleBean.USE_URI_STARTS_WITH);

        }else if (arrDefaultRule[4] == "FromLast")
            objNDBTRuleBean.setIncludeUriInNameOrder(objNDBTRuleBean.USE_URI_ENDS_WITH);

        if (arrDefaultRule[5] != "-")
            objNDBTRuleBean.setIncludeUriInNameSegments(arrDefaultRule[5]);

        if (!("-" == (arrDefaultRule[6]) || "" == (arrDefaultRule[6]))) {
            if (objNDBTRuleBean.getRuleMode() == objNDBTRuleBean.COMPLETE_URI) {

                objNDBTRuleBean.setRuleMode(objNDBTRuleBean.COMPLETE_URI_WITH_REQ_PARAM);
            }
            else {
                objNDBTRuleBean.setRuleMode(objNDBTRuleBean.SEGMENT_OF_URI_WITH_REQ_PARAM);
            }

        }

        if (arrDefaultRule[6] == "Request-Method") {
            objNDBTRuleBean.setDynamicSegmentType(objNDBTRuleBean.USE_HTTP_METHOD);
        }

        else if (arrDefaultRule[6] == "Request-Parameter-Value") {
            objNDBTRuleBean.setDynamicSegmentType(objNDBTRuleBean.USE_PARAMETERS);
            objNDBTRuleBean.setParameterName(arrDefaultRule[7]);
        }

        else if (arrDefaultRule[6] == "Request-URI-Segments-Numbers") {
            objNDBTRuleBean.setDynamicSegmentType(objNDBTRuleBean.USE_URI_IS_IN_LIST);
            var encodingRemovedStr = arrDefaultRule[7].replace("%2C", ",");
            var arrTemp = encodingRemovedStr.split(",");

            var intArr = new Object();          //intArr is a map of length arrTemp
            for (var k = 0; k < arrTemp.length; k++) {
                intArr[k] = parseInt(arrTemp[k]);
            }
            objNDBTRuleBean.setUriSegmentNoList(intArr);
        }

        globalRule = objNDBTRuleBean;
    }
    catch (err) {
        util.logger.warn(agentSetting.currentTestRun + " | Returning ");

    }
};

btGlobalRule.clearGlobalObj = function(){
    globalRule = new btRuleBean();
}

btGlobalRule.executeRulesAndReturnBTName = function(req){
    return globalRule.executeGlobalRule(req);

};

module.exports = btGlobalRule;