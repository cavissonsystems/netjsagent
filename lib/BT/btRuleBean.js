/**
 * Created by Siddhant on 26-09-2016.
 */

var util = require('../util')
function btRuleBean (){
    this.GLOBAL_RULE_TYPE = 1;
    this.CUSTOM_RULE_TYPE = 2;
    this.EXCLUSION_RULE_TYPE = 3;

    //GLOBAL rule mode
    this.COMPLETE_URI = 1;
    this.SEGMENT_OF_URI = 2;
    this.COMPLETE_URI_WITH_REQ_PARAM = 3;
    this.SEGMENT_OF_URI_WITH_REQ_PARAM = 4;

    //GLOBAL Rule REQ naming constants
    this.USE_URI_STARTS_WITH = 1;
    this.USE_URI_ENDS_WITH = 2;
    this.USE_URI_IS_IN_LIST = 3;
    this.USE_HTTP_METHOD = 4;
    this.USE_PARAMETERS = 5;

    //rule properties
    this.ruleType = this.GLOBAL_RULE_TYPE;
    this.ruleMode = this.SEGMENT_OF_URI;
    this.ruleName = "Global";
    //specify inclusion order of uri in BT name
    this.includeUriInNameOrder = this.USE_URI_STARTS_WITH;
    //number of URI segments used in bt name
    this.includeUriInNameSegments = 2;
    //dynamic part value need to be appended in bt name
    this.dynamicSegmentType = this.USE_HTTP_METHOD;
}

/**
 * @return the ruleMode
 */
btRuleBean.prototype.getRuleMode = function() {
    return this.ruleMode;
};

/**
 * @param ruleType the ruleType to set
 */
btRuleBean.prototype.setRuleType = function(ruleType){
    this.ruleType = ruleType;
};

/**
 * @param ruleMode the ruleMode to set
 */
btRuleBean.prototype.setRuleMode = function(globalNamingMode) {
    this.ruleMode = globalNamingMode;
};

/**
 * @param includeUriInNameOrder the includeUriInNameOrder to set
 */
btRuleBean.prototype.setIncludeUriInNameOrder = function(includeUriInNameOrder) {
    this.includeUriInNameOrder = includeUriInNameOrder;
};

/**
 * @param includeUriInNameSegments the includeUriInNameSegments to set
 */
btRuleBean.prototype.setIncludeUriInNameSegments = function(includeUriInNameSegments)
{
    var segments = parseInt(includeUriInNameSegments);
    this.includeUriInNameSegments = segments;
};

/**
 * @param dynamicSegmentType the dynamicSegmentType to set
 */
btRuleBean.prototype.setDynamicSegmentType = function(dynamicSegmentType) {
    this.dynamicSegmentType = dynamicSegmentType;
};

/**
 * @param splitParameterName the splitParameterName to set
 */
btRuleBean.prototype.setParameterName = function(parameterName) {
    this.parameterName = parameterName;
    this.parameterAtStart = parameterName + "=";
    this.parameterAtend = "&" + parameterName + "=";
};

/**
 * @param uriSegmentNoList the uriSegmentNoList to set
 */
btRuleBean.prototype.setUriSegmentNoList = function( uriSegmentNoList) {
    this.uriSegmentNoList = uriSegmentNoList;
}

btRuleBean.prototype.executeGlobalRule = function(req)
{
    /*if (NDBTMonitor.getBtMonitorTraceLevel() > 1)
        NDListener.logBCITrace(Server.TestRunIDValue,"","","executeGlobalRule method called. values of executeCustomRule : " + this+ "\n uri" +uri + " params - " + parameters);
*/
    //console.log("In executeGlobalRule " + this.ruleMode);

    var uri = req['url'];
    var httpMethod = req['method'];
    var parameters = uri.split('?');

    var btName = null;
    var urlLength = uri.length;
    var startIdx = 0;

    try
    {
        switch(this.ruleMode)
        {
            case this.COMPLETE_URI :
                /*if (NDBTMonitor.getBtMonitorTraceLevel() > 2)
                    NDListener.logBCITrace(Server.TestRunIDValue,"","","Values of COMPLETE_URI : " + COMPLETE_URI);*/
                return uri;

            case this.SEGMENT_OF_URI:
                /*if (NDBTMonitor.getBtMonitorTraceLevel() > 2)
                    NDListener.logBCITrace(Server.TestRunIDValue,"","","Values of SEGMENT_OF_URI : " + SEGMENT_OF_URI);*/

                btName = this.getBTNameFromUri(uri);

                //safety check
                /*if(null == btName)
                 {
                 System.out.println("safety check line executed");
                 btName = uri;
                 }*/

                return btName;


            case this.COMPLETE_URI_WITH_REQ_PARAM:
                /*if (NDBTMonitor.getBtMonitorTraceLevel() > 2)
                    NDListener.logBCITrace(Server.TestRunIDValue,"","","Values of COMPLETE_URI_WITH_REQ_PARAM : " + dynamicSegmentType);
*/
                if(this.dynamicSegmentType == this.USE_HTTP_METHOD)
                {
                    uri += "." + httpMethod;
                    return uri;
                }
                else if(this.dynamicSegmentType == this.USE_PARAMETERS)
                {
                    var paramValue = this.fetchSplitParameterValue(parameters);
                    if(null == paramValue)
                        return uri;
                    else
                        uri += "." + paramValue;
                }
                return uri;
            case this.SEGMENT_OF_URI_WITH_REQ_PARAM :
                /*if (NDBTMonitor.getBtMonitorTraceLevel() > 2)
                    NDListener.logBCITrace(Server.TestRunIDValue,"","","Values of SEGMENT_OF_URI_WITH_REQ_PARAM : " + dynamicSegmentType);
*/
                btName = btRuleBean.getBTNameFromUri(uri);

                //safety check
                /*if(null == btName)
                 btName = uri;*/

                if(this.dynamicSegmentType == this.USE_HTTP_METHOD)
                {
                    btName += "." + httpMethod;
                }
                else if(this.dynamicSegmentType == this.USE_PARAMETERS)
                {
                    var paramValue = this.fetchSplitParameterValue(parameters);
                    if(null == paramValue)
                        return btName;
                    else
                        btName += "." + paramValue;

                }
                else if(this.dynamicSegmentType == this.USE_URI_IS_IN_LIST)
                {
                    var uriSegments = uri.split("/");
                    for(var i = 0; i < this.uriSegmentNoList.length; i++)
                    {
                        try
                        {
                            if(this.uriSegmentNoList[i] > (uriSegments.length - 1) || i < 0)
                                break;

                            /*if (NDBTMonitor.getBtMonitorTraceLevel() > 2)
                                NDListener.logBCITrace(Server.TestRunIDValue,"","","Values of USE_URI_IS_IN_LIST : " + uriSegmentNoList[i] + " - " + uriSegments[uriSegmentNoList[i]]);
*/

                            btName += "/" + uriSegments[this.uriSegmentNoList[i]];
                        }
                        catch(err)
                        {
//							e.printStackTrace();
                        }
                    }
                }
                return btName;
            default :
                return btName;
        }
    }
    catch(err)
    {
//			ex.printStackTrace();
        return uri;
    }
};

btRuleBean.prototype.getBTNameFromUri = function(uri)
{
    try {
        var urlLength = uri.length;
        //console.log("uri is : " + uri.length + " & includeUriInNameOrder is : " + this.includeUriInNameOrder + " USE_URI_ENDS_WITH is : " + this.USE_URI_ENDS_WITH);
        if (this.includeUriInNameOrder == this.USE_URI_ENDS_WITH) {
            var index = urlLength - 1;
            var counter = 0;
            while (counter < this.includeUriInNameSegments) {
                if (index == -1)
                    break;

                if ('/' == uri.charAt(index))
                    counter++;

                index--;
            }
            return uri.substring(index + 1);
        }
        else {
            var Idx = 1;
            var end = 0;
            var counter = 0;
            while (counter < this.includeUriInNameSegments) {
                //console.log("In while loop");
                Idx = uri.indexOf('/', end + 1);
                //console.log("IDX is : " + Idx);
                if (Idx == -1) {
                    Idx = urlLength;
                    end = Idx;
                    break;
                }

                end = Idx;
                counter++;
            }
            return uri.substring(0, end);
        }
    }catch(err){
        util.logger.warn(err);
    }
};

btRuleBean.prototype.fetchSplitParameterValue = function(parameters)
{
    /*if (NDBTMonitor.getBtMonitorTraceLevel() > 1)
        NDListener.logBCITrace(Server.TestRunIDValue,"","","fetchParameter method called.Value of parameters : " + parameters + ", parameterName -  " + parameterName);
*/
    try
    {

        var paramIndex = 0;

        if(!parameters.startsWith(this.parameterAtStart))
        {
            paramIndex = parameters.indexOf(this.parameterAtend) + 1;

            if(paramIndex == 0)
                return null;
        }


        var paramValueStartIdx = paramIndex + this.parameterName.length+ 1;
        var paramValueEndIdx = parameters.indexOf("&", paramValueStartIdx);
        if(paramValueEndIdx == -1)
            paramValueEndIdx = parameters.length();

        return parameters.substring(paramValueStartIdx, paramValueEndIdx);
    }
    catch(err)
    {
//			ex.printStackTrace();
    }

    return null;
}

module.exports = btRuleBean;