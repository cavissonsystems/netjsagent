/**
 * Created by compass341 on 24-May-18.
 */

function downloadFile(){
    this.tier;
    this.server;
    this.instance;
    this.downloadpath;
    this.ndcPort;
    this.ndcHost;
    this.protocol;
    this.command;
    this.asyncId;
    this.compressMode;

}

downloadFile.parseArgs = function(tier,server,instance,downloadpath,ndcHost,ndcPort,compressMode,command,asyncId,protocol,port){
    this.tier = tier;
    this.server = server;
    this.instance = instance;
    this.downloadpath = downloadpath;
    this.ndcPort = ndcPort;
    this.ndcHost = ndcHost;
    this.command = command;
    this.asyncId = asyncId;
    this.compressMode = compressMode;
    this.protocol = protocol;
    this.port = port;
}

module.exports= downloadFile;
