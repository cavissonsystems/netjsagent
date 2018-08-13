
var util = require('./util')

function NDCServerConfig(){}

NDCServerConfig.retryCount = 3;        //Default it will try for 3 times
NDCServerConfig.sleepInterval = 60000;         //At every 60 seconds agent will retry for Control connection
NDCServerConfig.serverList = [];
NDCServerConfig.currentActiveServer = undefined;
NDCServerConfig.defaultServer = new Server(undefined , 7892 , 0 , 0)
NDCServerConfig.isSwitchOver=0

var Active= 1,
    Backup=0;

/*Active server always at 0th index of serverList
 StandBy server always at 1st index of serverList*/

NDCServerConfig.addServers = function(ndcAddress){
    try {
       /* if(!require('./agent-setting').isClusterMode){
            this.serverList.length = 0;
            NDCServerConfig.currentActiveServer = undefined;
        }*/
        var temp;
        for (var i in ndcAddress) {
            //if(i > 0 && this.serverList[i-1] && this.serverList[i-1].ndcHost == ndcAddress[i].host && this.serverList[i-1].ndcPort == ndcAddress[i].port )
            //    continue;

            temp = makeServerObject(ndcAddress[i].host, ndcAddress[i].port, ndcAddress[i].type, i,ndcAddress[i].protocols)

            if (temp) {
                if(temp.type == 1)
                    this.serverList[0] = temp;
                else if(temp.type == 0)
                    this.serverList[1] = temp;

                temp.index = this.serverList.length - 1
            }
        }
        if (!this.currentActiveServer)           // First time current server refrence is null , so pointing it to 0th index of server list
            this.currentActiveServer = this.serverList[0] ? this.serverList[0] : this.defaultServer;

        util.logger.info(0,'| Current Server List : ',JSON.stringify(this.serverList))
    }
    catch(err){
        util.logger.error(0,'| Error in NDCServerConfig.addServers : ',err)
    }
}

NDCServerConfig.getNextBackupServer = function(){

    if(this.serverList[this.currentActiveServer.index+1])
        this.currentActiveServer = this.serverList[this.currentActiveServer.index+1]
    else
        this.currentActiveServer = this.serverList[0]

    /*on every switch over we will reset priority_protocol refrence to 0th index of protocol array
    *we will reset 0th index port to default ndc port */

    this.currentActiveServer.currentActiveProtocol = 0
    //this.currentActiveServer.protocolList[0].port = this.currentActiveServer.ndcPort
    util.logger.info(0,'| Switch-over is envoking, Now Current server is :',this.currentActiveServer)
}

NDCServerConfig.getCurrentActiveProtocol = function(protocolist){
    if(!this.currentActiveServer){         // First time current server refrence is null , so pointing it to 0th index of server list
        this.currentActiveServer = this.serverList[0] ?  this.serverList[0] : this.defaultServer;
    }

    if(this.currentActiveServer.protocolList) {
        return this.currentActiveServer.protocolList[this.currentActiveServer.currentActiveProtocol]
    }
    return undefined;
}

NDCServerConfig.updateActiveProtocol = function(protocolist){
    try {
        if (!protocolist)   return;
        var arr = protocolist.split(',')

        /*
         * getting agent & NDC priority protocol and checking it
         * IF host is matched but port is not matched then we will update port and close the connection
         * */
        var agentPriorProtocol = this.currentActiveServer.protocolList[this.currentActiveServer.currentActiveProtocol];
        var ndcPriorProtocol = arr[0] ? arr[0].split(':') : 'tcp'

        if (ndcPriorProtocol[0].toLowerCase() == agentPriorProtocol.protocol.toLowerCase()) {
            if (agentPriorProtocol.port == ndcPriorProtocol[1]) {
                util.logger.warn(0, '| After matching protocol, host & port are matched ,so not closing the connection .')
                return false
            }
            else {
                if(this.currentActiveServer.currentActiveProtocol != 0) {
                    agentPriorProtocol.port = ndcPriorProtocol[1]
                    util.logger.warn(0,'| After matching protocol, host is matched but port is not, so updating the port and not closing the connection .',agentPriorProtocol)
                    return true
                }
                else{
                    util.logger.warn(0,'| After matching protocol, host is matched but port is not, but because of agent protocol index : 0, we are not changing port and not closing the connection .')
                    return false
                }
            }
        }

        /* If NDC and agent prior will not match ,then we will traverse each ndc protocol with every agent protocol .
         * IF host is matched but port is not matched then we will update port and close the connection
         * */
        for (let j in arr) {
            var ndcProto = arr[j].split(':')

            for (let i in this.currentActiveServer.protocolList) {
                let agentProto = this.currentActiveServer.protocolList[i]
                if (agentProto.protocol.toLowerCase() == ndcProto[0].toLowerCase()) {
                    if (agentProto.port == ndcProto[1]) {
                        if(agentPriorProtocol.protocol.toLowerCase() == agentProto.protocol.toLowerCase() && agentPriorProtocol.port == agentProto.port) {
                            util.logger.warn(0,'| After matching protocol, NDC prior protocl is not matched, but agent is connected with ndc provided protocl')
                            return false;
                        }
                        else{
                            this.currentActiveServer.currentActiveProtocol = i
                            util.logger.warn(0,'| After matching protocol, host and port are same, so closing the connection .',agentProto)
                            return true
                        }
                    }
                    else {
                        if(i != 0)
                            agentProto.port = ndcProto[1]
                        util.logger.warn(0, '| After matching protocol, host is same but port is not ,so closing the connection .',agentProto)
                        this.currentActiveServer.currentActiveProtocol = i
                        return true
                    }
                }
            }
        }
    }catch(err){
        util.logger.error(0,'| Error in NDCServerConfig.updateActiveProtocol : ',err)
    }
}

NDCServerConfig.switchNDCMode = function(){
    try{
        var agentSetting = require('./agent-setting');

        if(!agentSetting.isClusterMode){
            NDCServerConfig.getNextBackupServer();
            NDCServerConfig.isSwitchOver = 1
        }else if (agentSetting.isClusterMode){
            if(NDCServerConfig.serverList.length > 1)
                NDCServerConfig.serverList.pop()
            NDCServerConfig.getNextBackupServer();
            NDCServerConfig.isSwitchOver = 1
            agentSetting.requestType = 3;
        }
    }catch(e){
        util.logger.warn('0| Error in SwitchNDCMode',e)
    }
}

NDCServerConfig.updateLastConnInfo = function(){
    try{
        var agentSetting = require('./agent-setting');
        NDCServerConfig.currentActiveServer.connTimeStamp = new Date().getTime();
        agentSetting.lastConnTimeStamp = NDCServerConfig.currentActiveServer.connTimeStamp;
        agentSetting.lastConnHost = NDCServerConfig.currentActiveServer.ndcHost;
        agentSetting.lastConnPort = NDCServerConfig.currentActiveServer.ndcPort;

    }catch(e){
        util.logger.warn('Error in Updating the ConnectionInfo');
    }
}

function makeServerObject(ndcHost , ndcPort , type , index,protocols){
    if(ndcPort < 0 || ndcPort > 65535)
        return;

    if(ndcHost == undefined || ndcHost == null || ndcHost == 0 || ndcPort == undefined || ndcPort == null || ndcPort == 0 )
        return undefined;
    else
        return new Server(ndcHost , ndcPort , type , index,protocols)
}


function Server(ndcHost,ndcPort,type,index,protocols){

    this.ndcHost = ndcHost;
    this.ndcPort = ndcPort;
    this.type = type;
    this.index = index;
    this.protocolList = []
    var list = protocols ? protocols.split(',') : ['TCP']                //Creating array of all protocols

    for(var i in list){
        var protocol=undefined;
        var port=undefined;
        if(list[i].indexOf(':') > -1) {
            var tmp = list[i].split(':')
            protocol=tmp[0]
            port=tmp[1]
        }else{
            protocol = list[i]
        }
        if(protocol && protocol.toLowerCase().match(/tcp|ws|wss/))
            this.protocolList.push(new Protocols(protocol,port,i,this.ndcPort))           //Adding new protocol object in protocol list array
    }
    this.currentActiveProtocol = 0                                       //Everytime currentActiveProtocol will point to 0
}

function Protocols(protocolname,port,index,ndcPort){

    this.protocol = protocolname.toLowerCase();
    if(index == 0 && ndcPort && port && ndcPort != port ) {
        util.logger.warn(0,'| NDCPort:',ndcPort,'and Primary Protocol port:',port,'is different , so using NDCPort as default.')
        this.port = ndcPort;
    }
    else
        this.port = port ? port : (index == 0 ? ndcPort : 0);
}

module.exports = NDCServerConfig;
