/**
 * Created by Sahil on 10/16/17.
 */
var util = require('./../util');
var agentSetting = require('./../agent-setting');

function NDEntryPointManager(){}

NDEntryPointManager.entryPointMap ={}
NDEntryPointManager.isEntryPointConfigured = 1
NDEntryPointManager.isMethodInstrEnable = 1
NDEntryPointManager.isRedisExitPointConfigured = 1
NDEntryPointManager.isMongoExitPointConfigured = 1
NDEntryPointManager.isHttpExitPointConfigured = 1
NDEntryPointManager.files = []

NDEntryPointManager.reset = function(){

    NDEntryPointManager.entryPointMap ={}
    NDEntryPointManager.isEntryPointConfigured = 1
    NDEntryPointManager.isMethodInstrEnable = 1
    NDEntryPointManager.isRedisExitPointConfigured = 1
    NDEntryPointManager.isMongoExitPointConfigured = 1
    NDEntryPointManager.isHttpExitPointConfigured = 1

}
NDEntryPointManager.parseEntryPointFile =  function(data){
    try{
        this.reset();

        if(!data) return;

        for(var i in data){
            var validMethod=false,validType=false,validEnable=false;
            if(data[i].startsWith('#') || data[i].length == 0) continue;

            var tmp =data[i].split('|');
            validMethod = typeof tmp[0] == 'string' && tmp[0].length > 0 ? tmp[0]:false;
            validType = typeof tmp[1] == 'string' && tmp[1].length > 0 ? tmp[1]:false;
            validEnable = typeof tmp[2] == 'string' && (Number(tmp[2]) == 1 || Number(tmp[2]) == 0) ? Number(tmp[2]):false;
            //for CONSOLE and WINSTON , we have to keep only those methods which need to be instrumented.
            if(validMethod && validType && validEnable){
                if(this.entryPointMap[validType.toUpperCase()]){
                    var currentObject = this.entryPointMap[validType.toUpperCase()];
                    if(currentObject.enable == 0 && validEnable == 1){
                        currentObject.method = validMethod;
                        currentObject.enable = validEnable;
                    } else if(validEnable == 1 && currentObject.method.indexOf(validMethod) == -1)
                        currentObject.method = currentObject.method+','+validMethod;
                }else{
                    if(tmp.length >3)
                        this.entryPointMap[validType.toUpperCase()] = {module: validType, method: validMethod,enable: validEnable,entryExit:tmp[3]}
                    else if(tmp.length == 3)
                        this.entryPointMap[validType.toUpperCase()] = {module: validType, method: validMethod,enable: validEnable}
                }
            }else if(!validMethod || !validType){
                util.logger.error(agentSetting.currentTestRun,'| Invalid the data received in NDEnytryPoints File ',data[i]);
            }
        }
        //Want to Disable the feature , Go ahead.
        if(Object.keys(this.entryPointMap).length >0){
            this.isEntryPointConfigured =  (this.entryPointMap['HTTP'] && this.entryPointMap['HTTP'].enable == 0) ? 0 : 1
            this.isRedisExitPointConfigured = (this.entryPointMap['REDIS'] && this.entryPointMap['REDIS'].enable == 0) ? 0 : 1
            this.isMongoExitPointConfigured = (this.entryPointMap['MONGO'] && this.entryPointMap['MONGO'].enable == 0) ? 0 : 1
            this.isMethodInstrEnable = (this.entryPointMap['HTTP'] && this.entryPointMap['HTTP'].entryExit == 0) ? 0 : 1
            this.isHttpExitPointConfigured = (this.entryPointMap['HTTP_REQUEST'] && this.entryPointMap['HTTP_REQUEST'].enable == 0) ? 0 : 1
        }
    }catch(e){
        util.logger.error(agentSetting.currentTestRun,'| Error while parsing the NDEntryPoints File')
    }
}

module.exports = NDEntryPointManager;
