/**
 * Created by Sahil on 06-09-2016.
 */

function ndMethodMetaData(){
}

var methodMap = new Object();
var methodMonitorMap = new Object();
var methodId = 0;
var agentSetting = require('./../agent-setting');
var samples = require('./../nodetime/lib/samples.js');
var util = require('./../util');

ndMethodMetaData.getLength = function(){
    return Object.keys(methodMap).length;
}

ndMethodMetaData.getValue = function(key,args){              //map[(data),(id)]
    var id=methodMap[key];
    if(!id){
        id=this.set(key,args);
    }
    return id;
};

ndMethodMetaData.getMethodMonitorName = function(key){              //map[(data),(id)]
    return methodMonitorMap[key];
};

ndMethodMetaData.getKey = function(value){
    /*var key;
    var keys = Object.keys(methodMap);
    for( var i = 0; i< keys.length; i++) {
        if(methodMap[keys[i]] == value){
            key = keys[i];
        }
    };
    return key;*/
    return methodMonitorMap[key];
};

ndMethodMetaData.backendMeta = function(methodName){
    try{
        var id = methodMap[methodName];
        if(!id){
           // if (agentSetting.isToInstrument) {
                methodId = methodId + 1;

                id = methodMap[methodName] = methodId ;

                var methodMetaData = '5,' + methodName + ',' + methodId;

                samples.add(methodMetaData + "\n");

        }
        return id ;
    } catch (err) {
        util.logger.warn(err);
    }
};

ndMethodMetaData.set = function(methodName,args){
    try{

        if(methodMap[methodName] == undefined){
        if (agentSetting.isToInstrument) {
            methodId = methodId + 1;

            methodMap[methodName] = methodId;
            var functionArguments = '';
            //console.log("Name of function called- "+args.args.callee);
            var k=0;
            if(args.args) {
                for (k in args.args) {
                    var obj = args.args[k];

                    if (obj) {
                        if (functionArguments !== '')
                            functionArguments = functionArguments + "" + typeof obj + ";";
                        else
                            functionArguments = typeof obj + ";";
                    }
                }
            }
            var methdoName_line;
            if(methodName.indexOf(';') != -1){
                methdoName_line = methodName.split(';')
                methodName = methdoName_line[0] +'(' + functionArguments + ');' + methdoName_line[1];
            }
            else
                methodName = methodName +'(' + functionArguments + ')' ;

            var methodMetaData = '5,' + methodName + ',' + methodId;
			/*
                Method Map for Method Moniotr
            **/
            methodMonitorMap[methodId] = methodName;
            samples.add(methodMetaData + "\n");
            }
        }
        return methodId;
    } catch (err) {
        util.logger.warn(err);
    }
};

ndMethodMetaData.getAll = function(){
    var data = [];
    for(var i in methodMonitorMap){
        var meta = '5,' + methodMonitorMap[i]  + ',' + i + '\n';
        data.push(meta)
    }
    return data;
};

ndMethodMetaData.clear = function(){
   methodMap = new Object();
   methodMonitorMap = new Object();
   methodId = 0;
};
module.exports = ndMethodMetaData;
