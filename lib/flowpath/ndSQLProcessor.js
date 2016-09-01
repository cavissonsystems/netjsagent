/**
 * Created by Sahil on 7/26/16.
 */

var StringBuffer = require('./StringBuffer').StringBuffer;
var AgentSetting = require('../agent-setting');
var util = require ('../util');

var nonPreparedQueryRecordID = 23;
var ENCODED_VAL_COMMA = "&#044;";
var ENCODED_VAL_NEW_LINE = "&#010;";
var ENCODED_VAL_SINGLE_QUOTE = "&#039;";
var ENCODED_VAL_DOUBLE_QUOTE = "&#034;";
var ENCODED_VAL_BACKSLASH = "&#092;";
var ENCODED_VAL_PIPE_SYMBOL = "&#124;";
var ENCODED_VAL_DOT_SYMBOL = "&#46;";
var ENCODED_VAL_COLON_SYMBOL = "&#58;";
var ENCODED_VAL_TO_SPACE = " ";

function ndSQLProcessor()
{
}

ndSQLProcessor.dumpDBMetaRecord = function(sb, encodedQuery,flowpathId,queryId,nonPreparedQueryRecordID)
{

    sb.add(nonPreparedQueryRecordID);
    sb.add(',');
    sb.add(flowpathId);
    sb.add(',');
    sb.add(queryId);
    sb.add(',');
    sb.add(encodedQuery);
    sb.add('\n')

}


ndSQLProcessor.dumpNonPreparedSQLQueryEntry= function (command,flowpathId,queryId)
{
    var sb = new StringBuffer();
    sb.clear();
    var encodedQuery = this.encodeQuery(sb,command.toUpperCase());
    encodedQuery = encodedQuery.toString();

    this.dumpDBMetaRecord(sb, encodedQuery, flowpathId, queryId ,nonPreparedQueryRecordID);

    util.logger.info("Dumping MetaRecord for Query : " + sb.toString());
    try {
        if (AgentSetting.isToInstrument && AgentSetting.dataConnHandler) {
            AgentSetting.dataConnHandler.client.write(sb.toString());
        }
    }
    catch (err) {
        util.logger.warn("Error in Dumping metarecord for Backend :" + err);
    }
}

ndSQLProcessor.encodeQuery= function(sb,command)
{
    var len = command.length;
    for(var i=0; i<len; i++)
    {
        var c = command.charAt(i);
        switch (c)
        {
            case ',':
                sb.add(ENCODED_VAL_COMMA);
                break;
            case '\n':
                sb.add(ENCODED_VAL_NEW_LINE);
                break;
            case '\'':
                sb.add(ENCODED_VAL_SINGLE_QUOTE);
                break;
            case '\"':
                sb.add(ENCODED_VAL_DOUBLE_QUOTE);
                break;
            case '\\':
                sb.add(ENCODED_VAL_BACKSLASH);
                break;
            default:
                sb.add(c);
                break;
        }
    }
    return sb ;
}

module.exports = ndSQLProcessor;