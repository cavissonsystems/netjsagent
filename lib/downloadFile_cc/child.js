/**
 * Created by compass341 on 24-May-18.
 */
var fs = require('fs');
var dwnldFile = require('./downloadFile.js');
var NDConnectionManager = require("./../NDConnectionManager");
var backlog = [];

dwnldFile.parseArgs(process.argv[2],process.argv[3],process.argv[4],process.argv[5],process.argv[6],process.argv[7],process.argv[8],process.argv[9],process.argv[10],process.argv[11],process.argv[12],process.argv[13],process.argv[14]);
if(dwnldFile.downloadpath){
try{
   connectToNDC();
   }catch(e){ process.send({code:0,value:"Child Process, error in creating connection "+ e.toString()})}
}
var dataSocket;
function connectToNDC() {
    var currProto = {protocol: dwnldFile.protocol, port: dwnldFile.port}
    dataSocket = NDConnectionManager.makeTemporaryWsDataConnection(currProto);
    dataSocket.createDataConn({ndcHost:dwnldFile.ndcHost}, true, currProto, function (err) {
        dataSocket.client._readableState.highWaterMark = 1024 * 1024 * 15;
        dataSocket.client._writableState.highWaterMark = 1024 * 1024 * 15;
        process.send({code:1,value:"Child Process, Temporary Data Connection established with NDCollector : Socket[addr=" + dwnldFile.ndcHost + ",port=" + dwnldFile.ndcPort+ ",localport=" +((currProto.protocol == 'tcp') ? this.localPort : dataSocket.client.socket._socket.address().port)+']'});
        startDownloading(dataSocket);
    })
}
function startDownloading(dataSocket) {
    try {
        dataSocket.write("run_async_command_data_req:Command=" + dwnldFile.command + ";Id=" + dwnldFile.asyncId + ";Tier=" + dwnldFile.tier + ";Server=" +dwnldFile.server + ";Instance=" + dwnldFile.instance + ";Size=-1;CompressMode="+dwnldFile.compressMode+"\n")
        dataSocket.write("Complete\n")

        var rStream = fs.createReadStream(dwnldFile.downloadpath, {highWaterMark: 1024 * 1024 * 10})
        dataSocket.client.on('drain', function () {
            rStream.resume()
        })
        rStream.pipe(dataSocket.client, {end: false}).on('error', function (err) {
            if (err) {
                rStream.pause()
            }
        })

        rStream.on('end', function () {
            handleEnd(dataSocket)
        })
    }
    catch (e) {
        process.send({code:0,value:"Child Process, error in downloading file "+ e.toString()});
    }
}

function handleEnd(dataSocket) {
    try {
        if (dataSocket.client && dataSocket.client._writableState && dataSocket.client._writableState.length == 0) {
            dataSocket.write('Heapdump:Result=OK;')
            closeConnection(dataSocket)
            delete dataSocket
            process.send({code:2,value:"Child Process, file downloading has been completed, so closing temp connection."});
        }
        else {
            if (dataSocket.client && dataSocket.client.writable) {
                setTimeout(function () {
                    handleEnd(dataSocket)
                }, 2000)
            }
            else {
                process.send({code:0,value:"Child Process, connection is not there while sending last message to NDC in case of Heap_Dump... "});
            }
        }
    }
    catch (e) {
        process.send({code:0,value:"Child Process, error in handleEnd fn "+ e.toString()});
    }
}

var connectConnListener = function() {
    try {
        dataSocket.timeout = undefined;
        if(!dataSocket.istempDataConn){
            if( backlog.length ) {
                for(var i= 0, len= backlog.length; len>i; ++i)
                    dataSocket.client.send(backlog[i]);

                backlog.length= 0;
            }
        }
    }
    catch(e){
        process.send({code:0,value:"Child Process, error in connectConnListener fn "+ e.toString()});
    }
}

var closeConnListener =function(err) {
    process.send({code:0,value:"Child Process, data connection, Received socket close event from Host : "+dwnldFile.ndcHost+" ,Port="+dwnldFile.ndcPort +", Error :  "+err.toString()});
    if(dataSocket.istempDataConn) {
        dataSocket.closeConnection();
    }
    else{
        if(dataSocket.client) {
            dataSocket.client.removeAllListeners();
        }
        dataSocket.connectToServer();
    }
}

 function closeConnection(dataSocket) {
    try {
        /*
         * 1. We are removing close listener befor closing connection because is close listener we are retrying for connection .
         * 2. After closing connection , removing all liteners ,because in close's handshaking, server will send error, so agent should handle
         * exceptions*/
        if (dataSocket.client) {
            dataSocket.client.removeListener('close',closeConnListener)
            dataSocket.client.removeListener('open',connectConnListener);
            dataSocket.client.removeAllListeners();
            if(dwnldFile.protocol != 'tcp')
                dataSocket.client.close();
            else
                dataSocket.client.destroy();
            delete dataSocket.client;
            dataSocket.client = undefined;
        }
        dataSocket.ndcHost = 0;
        dataSocket.ndcPort = 7892;
        clearTimeout(dataSocket.timeout)
        dataSocket.timeout = null;
        dataSocket.istempDataConn = false;
        dataSocket.discardedFPLength = 0;
        delete dataSocket.dataMsgHandler;
    }
    catch(e){
        process.send({code:0,value:"Child Process, error in closeConnection fn "+ e.toString()});
    }
}