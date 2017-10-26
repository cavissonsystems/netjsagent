/**
 * Created by Sahil on 10/16/17.
 */

function NDEntryPointManager(){}

NDEntryPointManager.entryPointMap ={}
NDEntryPointManager.isEntryPointConfigured = 1
NDEntryPointManager.isMethodInstrEnable = 1
NDEntryPointManager.isRedisEntryPointConfigured = 1
NDEntryPointManager.isMongoEntryPointConfigured = 1

NDEntryPointManager.parseEntryPointFile =  function(data){
    this.entryPointMap = {};  this.isEntryPointConfigured=1;
    if(!data) return;
    data = data.toString().split(',')
    for(var i in data){
        if(data[i].startsWith('#')) continue;

        var tmp =data[i].split('|');
        if(tmp.length >3)
            this.entryPointMap[tmp[0].toUpperCase()] = {module: tmp[0], method: tmp[1],entryExit:tmp[2],enable: tmp[3]}
        else if(tmp.length == 3)
            this.entryPointMap[tmp[0].toUpperCase()] = {module: tmp[0], method: tmp[1],enable: tmp[2]}
    }
    this.isEntryPointConfigured = (Object.keys(this.entryPointMap).length >0 && this.entryPointMap['HTTP'].enable == 0)  ? 0 :1
    this.isRedisEntryPointConfigured = (Object.keys(this.entryPointMap).length >0 && this.entryPointMap['REDIS'].enable == 0)  ? 0 :1
    this.isMongoEntryPointConfigured = (Object.keys(this.entryPointMap).length >0 && this.entryPointMap['MONGO'].enable == 0)  ? 0 :1
    this.isMethodInstrEnable = (Object.keys(this.entryPointMap).length >0 && this.entryPointMap['HTTP'].entryExit == 0)  ? 0 :1
}

module.exports =NDEntryPointManager;
