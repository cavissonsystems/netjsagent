/**
 * Created by Siddhant on 07-09-2016.
 */

function ndSQLMetaData(){

}

var nonPreparedQueryMap = new Object();
var nonPreparedQueryId = 6;     //Every query has unique id & used to dump quey meta record(23) , starting from 6 because 1-6 id are reserved
var agentSetting = require('./../agent-setting');
var ut = require('./../util');
var ndSQLProcessor = require('./../flowpath/ndSQLProcessor');

ndSQLMetaData.getLength = function(){
    return Object.keys(nonPreparedQueryMap).length;
}

ndSQLMetaData.getNonPreparedValue = function(key){
    return nonPreparedQueryMap[key];
};

ndSQLMetaData.getNonPreparedKey = function(value){

    var key;
    var keys = Object.keys(nonPreparedQueryMap);
    for( var i = 0; i< keys.length; i++) {
        if(nonPreparedQueryMap[keys[i]] == value){
            key = keys[i];
        }
    };
    return key;
};

ndSQLMetaData.setNonPrepared = function(command, fpId) {
    var id = nonPreparedQueryMap[command]
    if (!id) {
        nonPreparedQueryMap[command] = id = ++nonPreparedQueryId ;
        ndSQLProcessor.dumpNonPreparedSQLQueryEntry(command, fpId, nonPreparedQueryId);
    }
    return id;
};

ndSQLMetaData.getAll = function(){
    var data = [];
    var keys = Object.keys(nonPreparedQueryMap);
    for (var i = 0; i < keys.length; i++) {
        var record = "na";
        var val = ndSQLMetaData.getNonPreparedKey(i);
        record = '23'  + ",0," + i + "," + val + '\n';
        data.push(record);
    }
    return data;
};

ndSQLMetaData.clear = function(){
    nonPreparedQueryMap = new Object();
    nonPreparedQueryId = 6;
};

module.exports = ndSQLMetaData;

