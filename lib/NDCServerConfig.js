
var util = require('./util')
function NDCServerConfig(){}

NDCServerConfig.retryCount = 3;        //Default it will try for 3 times
NDCServerConfig.sleepInterval = 60000;         //At every 60 seconds agent will retry for Control connection
NDCServerConfig.serverList = [];
NDCServerConfig.currentActiveServer = undefined;
NDCServerConfig.isSwitchOver=0
var Active= 1,
    Backup=0;

/*Active server always at 0th index of serverList
 StandBy server always at 1st index of serverList*/

NDCServerConfig.addServers = function(ndcAddress){
    this.serverList.length = 0;
    var temp;
    for(var i in ndcAddress) {
        //if(i > 0 && this.serverList[i-1] && this.serverList[i-1].ndcHost == ndcAddress[i].host && this.serverList[i-1].ndcPort == ndcAddress[i].port )
        //    continue;

        temp = makeServerObject(ndcAddress[i].host, ndcAddress[i].port, ndcAddress[i].type, i)
        if (temp) {
            this.serverList.push(temp)
            temp.index = this.serverList.length - 1
        }
    }
}

NDCServerConfig.getNextBackupServer = function(){
    if(this.serverList[this.currentActiveServer.index+1])
        this.currentActiveServer = this.serverList[this.currentActiveServer.index+1]
    else
        this.currentActiveServer = this.serverList[0]

    util.logger.info(0,'| Switch-over is envoking, Now Current server is :',this.currentActiveServer)
}

function makeServerObject(ndcHost , ndcPort , type , index){
    if(ndcPort < 0 || ndcPort > 65535)
        return;

    if(ndcHost == undefined || ndcHost == null || ndcHost == 0 || ndcPort == undefined || ndcPort == null || ndcPort == 0 )
        return undefined;
    else if (ndcHost.length == 0 || ndcPort.length == 0)
        return undefined;
    else
        return{ndcHost:ndcHost , ndcPort:ndcPort , type:type , index:index}
}
module.exports = NDCServerConfig;
