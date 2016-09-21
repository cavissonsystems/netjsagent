/**
 * Created by Siddhant on 06-09-2016.
 */

function ndMethodMetaData(){
}

var methodMap = new Object();
var methodId = 0;
var agentSetting = require('./../agent-setting');
var samples = require('./../nodetime/lib/samples.js');
var util = require('./../util');

ndMethodMetaData.getValue = function(key){              //map[(data),(id)]
    //console.log("key is : " + key + " value is : " + ndMethodMetaData.methodMap[key]);
    return methodMap[key];
};

ndMethodMetaData.getKey = function(value){
    var key;
    var keys = Object.keys(methodMap);
    for( var i = 0; i< keys.length; i++) {
        if(methodMap[keys[i]] == value){
            key = keys[i];
        }
    };
    return key;
};

ndMethodMetaData.set = function(methodName){
    try{

        if(methodMap[methodName] == undefined){
        if (agentSetting.isToInstrument) {
            methodId = methodId + 1;
            methodMap[methodName] = methodId;

            var methodMetaData = '5,' + methodName + ',' + methodId;

            samples.add(methodMetaData + "\n");
            }
        }
        return;
    } catch (err) {
        util.logger.warn(agentSetting.currentTestRun + " | Error is "+err);
    }
};

ndMethodMetaData.getAll = function(){
    var data = [];
    for(var i in methodMap[i]){
        var meta = '5,' + i + ',' + methodMap[i] + '\n';
        data.push(meta)
    }
    return data;
};

ndMethodMetaData.clear = function(){
   methodMap = new Object();
    methodId = 0;
};
module.exports = ndMethodMetaData;
