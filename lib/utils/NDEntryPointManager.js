/**
 * Created by Sahil on 10/16/17.
 */

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
    this.reset();

    if(!data) return;
    data = data.toString().split(',')
    for(var i in data){
        if(data[i].startsWith('#')) continue;

        var tmp =data[i].split('|');
        if(tmp.length >3)
            this.entryPointMap[tmp[0].toUpperCase()] = {module: tmp[0], method: tmp[1],enable: tmp[2],entryExit:tmp[3]}
        else if(tmp.length == 3)
            this.entryPointMap[tmp[0].toUpperCase()] = {module: tmp[0], method: tmp[1],enable: tmp[2]}
    }
    if(Object.keys(this.entryPointMap).length >0){
        this.isEntryPointConfigured =  (this.entryPointMap['HTTP'] && this.entryPointMap['HTTP'].enable == 0) ? 0 : 1
        this.isRedisExitPointConfigured = (this.entryPointMap['REDIS'] && this.entryPointMap['REDIS'].enable == 0) ? 0 : 1
        this.isMongoExitPointConfigured = (this.entryPointMap['MONGO'] && this.entryPointMap['MONGO'].enable == 0) ? 0 : 1
        this.isMethodInstrEnable = (this.entryPointMap['HTTP'] && this.entryPointMap['HTTP'].entryExit == 0) ? 0 : 1
        this.isHttpExitPointConfigured = (this.entryPointMap['HTTP_REQUEST'] && this.entryPointMap['HTTP_REQUEST'].enable == 0) ? 0 : 1
    }

}

module.exports =NDEntryPointManager;
