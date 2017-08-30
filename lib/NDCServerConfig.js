
function NDCServerConfig(){}

NDCServerConfig.retryCount = 3;        //Default it will try for 3 times
NDCServerConfig.sleepInterval = 60000;         //At every 60 seconds agent will retry for Control connection
NDCServerConfig.serverList = [];
NDCServerConfig.currentActiveServer = undefined;
NDCServerConfig.isSwitchOver=0
var Active= 1,
    Backup=0;

NDCServerConfig.addServers = function(ndcHost , ndcPort , backupNdcHostName , backupNdcPort){
    this.serverList.length = 0;
    var temp = makeServerObject(ndcHost , ndcPort,Active,0)
    if(temp)this.serverList.push(temp)                          //Adding active server at 0th index of serverList

    temp = makeServerObject(backupNdcHostName , backupNdcPort,Backup,1)
    if(temp)this.serverList.push(temp)                          //Adding standBy server at 1st index of serverList
}

NDCServerConfig.getNextBackupServer = function(){
    if(this.serverList[this.currentActiveServer.index+1])
        this.currentActiveServer = this.serverList[this.currentActiveServer.index+1]
    else
        this.currentActiveServer = this.serverList[0]
}

function makeServerObject(ndcHost , ndcPort , type , index){
    if(ndcHost == undefined || ndcHost == null || ndcHost == 0 || ndcPort == undefined || ndcPort == null || ndcPort == 0 )
	    return undefined;
    else	
        return{ndcHost:ndcHost , ndcPort:ndcPort , type:type , index:index}
}
module.exports = NDCServerConfig;
