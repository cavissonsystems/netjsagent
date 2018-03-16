
/**
 * Created by Sahil on 7/29/16.
 */
var fs = require('fs'),
    zlib = require('zlib');
var profiler
try {
    profiler = require('cavisson-profiling-tool');
}catch(e){console.log("Can't find module cavisson-profiling-tool ")}
var stringBuffer = require('./flowpath/StringBuffer.js').StringBuffer;
var agentSetting = require('./agent-setting.js');
var ut = require('./util');
var timeOutToStartHeartBeat = undefined
var mkdirp = require('mkdirp')

function v8_profiler () {

    this.stream;
    this.snapshot1;
    this.compressMode = 1;
    this.downloadFile = 2;
    this.fileName = '/tmp/'+new Date()+'.heapsnapshot'
    this.gzip
    this.dataSocket

}

v8_profiler.prototype.initProfilerObject = function(clientMsg,dataSocket,errorCallBack){
    /* * *
         *  Parsing the clientMsg
         * * */
    try{
        var self = this
        var splitArr = clientMsg.split(";"),dir
        for(var i=0; i<splitArr.length; i++){

            if(splitArr[i] == '') continue

            if(splitArr[i].indexOf("CompressMode") != -1){
                self.compressMode = parseInt(splitArr[i].split("=")[1]);
            }
            else if(splitArr[i].indexOf("DownloadFile") != -1){
                self.downloadFile = parseInt(splitArr[i].split("=")[1])
            }
            else if(splitArr[i].indexOf("FileName") != -1){

                var tmp = splitArr[i].split("=")[1]
                dir = tmp.substring(0,tmp.lastIndexOf('/'))
                var tmpfileName = tmp.substring(tmp.lastIndexOf('/')+1)

                if(!tmpfileName || tmpfileName == '')
                    self.fileName = tmp+new Date()+'.heapsnapshot'
                else
                    self.fileName = tmp
            }
        }

        if(self.compressMode == 1){
            self.fileName = self.fileName+'.gz'
            self.gzip = zlib.createGzip({chunkSize:1024*1024*5,level:9,highWaterMark:1024*1024*10});
        }

        self.dataSocket = dataSocket

        if(self.downloadFile == 1 || self.downloadFile == 0){
            self.mkDirOnServer(dir,errorCallBack)
        }
    }
    catch(e){
        ut.logger.error(agentSetting.currentTestRun, '| Error While Initializing the v8_Object',e )
    }
}

v8_profiler.prototype.mkDirOnServer = function(fpath,errorCallBack){
    try{
        var self = this
        if(!fs.existsSync(fpath)){
            mkdirp.sync(fpath,function(err){
                if(err){
                    self.cleanV8Object(err,errorCallBack)
                }
            })
        }
        else
            fs.accessSync(fpath, fs.constants.X_OK | fs.constants.W_OK | fs.constants.R_OK)
    }catch(e){
        self.cleanV8Object(e,errorCallBack)
        ut.logger.error(agentSetting.currentTestRun, '| Error: While Creating the Directory : ',e)
    }
}

v8_profiler.prototype.TakeSnapShot = function() {

    try{
        var self = this
        ut.logger.info(agentSetting.currentTestRun + " | v8_profiler.takeHeapSnapShot , Taking heapsnapshot On New Connection (mb)", parseInt((process.memoryUsage().heapUsed / 1048576).toFixed(3)))
        self.snapshot1 = profiler.takeSnapshot();
        ut.logger.info(agentSetting.currentTestRun + " | v8_profiler.takeHeapSnapShot , Heapdump taken successfully (mb)", parseInt((process.memoryUsage().heapUsed / 1048576).toFixed(3)))
        self.stream = self.snapshot1.export()
        self.stream._readableState.highWaterMark = 1024 * 1024 * 10;
        self.stream._writableState.highWaterMark = 1024 * 1024 * 10;

    }catch(e){
        ut.logger.error(agentSetting.currentTestRun, '| Error: While Taking Heap Snapshot : ',e )
    }
}

v8_profiler.prototype.takeHeapSnapShotOnNewConn = function(clientSocket,dataSocket,clientMsg,asyncId,command,errorCallBack){

    try {
        var self = this
        if (!profiler) {
            ut.logger.error(agentSetting.currentTestRun, '| Cannot load cavisson-profiling-tool ,cavisson-profiling-tool value is :', profiler)
            throw new Error('! profiler')
        }

        self.initProfilerObject(clientMsg,dataSocket,errorCallBack)

        self.dataSocket.write("run_async_command_data_req:Command=" + command + ";Id=" + asyncId + ";Tier=" + agentSetting.tier + ";Server=" + agentSetting.server + ";Instance=" + agentSetting.instance + ";Size=-1;CompressMode="+self.compressMode+"\n")
        self.dataSocket.write("Complete\n")

        self.TakeSnapShot()

            if ( self.downloadFile == 0 ){
                self.CreateUnCompressHeapFile(errorCallBack)
            }
            else if ( self.downloadFile == 1){
                if(self.compressMode == 0){
                    self.CreateAndDownloadUncompressHeap(errorCallBack)
                }
                else if(self.compressMode == 1){
                    self.CreateAndDownloadCompressHeap(errorCallBack)
                }
            }
            else if ( self.downloadFile == 2 ){
                if ( self.compressMode == 0 ){
                    self.DownloadUnCompressHeap(errorCallBack)
                }
                else if ( self.compressMode == 1 ){
                    self.DownloadCompressHeap(errorCallBack)
                }
            }

    } catch (e){
        self.cleanV8Object(e,errorCallBack)
        ut.logger.info(agentSetting.currentTestRun + "| Error occured during Taking HeapDump main (Catch): "+e)
    }
}

/* * *
* case : UnCompress HeapDump on Server Only       : [function] CreateUnCompressHeapFile
* case : UnCompress HeapDump on Server and NDC    : [function] CreateAndDownloadUncompressHeap
* case : Compress HeapDump on Server and NDC      : [function] CreateAndDownloadCompressHeap
* case : UnCompress HeapDump on NDC Only          : [function] DownloadUnCompressHeap
* case : Compress HeapDump on NDC Only            : [function] DownloadCompressHeap
* * */

v8_profiler.prototype.DownloadCompressHeap = function(errorCallBack){

    try{
        var self = this
        var socket = self.dataSocket.getSocket()
        var zstream = self.stream.pipe(self.gzip)
        zstream.pipe(self.dataSocket.client,{end:false}).on('error',function(err){
            if(err)
                zstream.pause()
        })
        socket.on('drain',function(){zstream.resume()})
        zstream.on('end',function(){self.handleEnd(errorCallBack)})
        ut.logger.info(agentSetting.currentTestRun + " | v8_profiler : Compressed File Transfered")
    }
    catch(e){
        self.cleanV8Object(e,errorCallBack)
    }
}

v8_profiler.prototype.DownloadUnCompressHeap = function(errorCallBack){

    try{
        var self = this
        var socket = self.dataSocket.getSocket()
        self.stream.pipe(self.dataSocket.client,{end:false}).on(('error'),function(err){
            if(err)
                self.stream.pause()
        })
        socket.on('drain',function(){self.stream.resume()})
        self.stream.on('end',function(){self.handleEnd(errorCallBack)})
        ut.logger.info(agentSetting.currentTestRun + " | v8_profiler : UnCompressed File Transfered")
    }
    catch(e){
        self.cleanV8Object(e,errorCallBack)
    }
}

v8_profiler.prototype.CreateUnCompressHeapFile =  function(errorCallBack) {

    try {
        var self = this
        var wStream = fs.createWriteStream(self.fileName, {highWaterMark: 1024 * 1024 * 10})
        self.stream.pipe(wStream)
        self.stream.on('end',function(){self.handleEnd(errorCallBack)})
        ut.logger.info(agentSetting.currentTestRun + " | v8_profiler : Created Uncompressed file on server, Path :", self.fileName)
    }
    catch(e){
        self.cleanV8Object(e,errorCallBack)
    }
}

v8_profiler.prototype.CreateAndDownloadCompressHeap = function(errorCallBack) {
    
    try{
        var self = this
        var wStream = fs.createWriteStream(self.fileName,{highWaterMark:1024 * 1024 * 10})
        var zipped = self.stream.pipe(self.gzip).on('end',function(){self.sendFileToNDC(errorCallBack)})
        zipped.pipe(wStream)
        ut.logger.info(agentSetting.currentTestRun + " | v8_profiler : Created Compressed file on server, Path :",self.fileName)
    }
    catch(e){
        self.cleanV8Object(e,errorCallBack)
    }
}

v8_profiler.prototype.CreateAndDownloadUncompressHeap = function(errorCallBack){

    try{
        var self = this
        var wStream = fs.createWriteStream(self.fileName,{highWaterMark:1024 * 1024 * 10})
        self.stream.pipe(wStream)
        self.stream.on('end',function(){self.sendFileToNDC(errorCallBack)})
        ut.logger.info(agentSetting.currentTestRun + " | v8_profiler : Created UnCompressed file on server, Path :",self.fileName)
    }
    catch(e){
        self.cleanV8Object(e,errorCallBack)
    }

}

v8_profiler.prototype.sendFileToNDC = function(errorCallBack) {

    try{
        var self = this
        var socket = self.dataSocket.getSocket()
        var rStream = fs.createReadStream(self.fileName, {highWaterMark: 1024 * 1024 * 10})
        socket.on('drain', function () {
            rStream.resume()
        })
        rStream.pipe(self.dataSocket.client,{end: false}).on('error', function (err) {
            if (err) {
                rStream.pause()
            }
        })

        rStream.on('end',function(){self.handleEnd(errorCallBack)})
        ut.logger.info(agentSetting.currentTestRun + " | v8_profiler : Sending File to NDC")
    }
    catch(e){
        self.cleanV8Object(e,errorCallBack)
    }
}

v8_profiler.prototype.handleEnd = function(errorCallBack){
    
    try{
        var self = this
        if (self.dataSocket.client && self.dataSocket.client._writableState && self.dataSocket.client._writableState.length == 0 ) {
            self.dataSocket.write('Heapdump:Result=OK;')
            ut.logger.info(agentSetting.currentTestRun + " | End of Taking Heapdump Process Cycle");
            self.cleanV8Object(undefined,errorCallBack)
        }
        else {
            if(self.dataSocket.client && self.dataSocket.client.writable)
                setTimeout(function(){self.handleEnd(errorCallBack)}, 2000)
            else
                self.cleanV8Object(new Error('Connection is not there'),errorCallBack)
        }
    }
    catch(e) {
        self.cleanV8Object(e,errorCallBack)
    }
}

v8_profiler.prototype.cleanV8Object = function(e,errorCallBack){

    try{
        var self = this
        if(self.dataSocket){
            self.dataSocket.closeConnection();
        }
        if(self.snapshot1){
            delete self.snapshot1
        }
        self.stream = undefined;
        self.gzip = undefined;
        self.dataSocket = undefined;
        errorCallBack(e)
        ut.logger.info(agentSetting.currentTestRun + " | Cleaned the V8Object Instance . ")
    }
    catch(e){
        ut.logger.error(agentSetting.currentTestRun, '| Error: While Cleaning the V8 Object : ',e )
    }

}

v8_profiler.takeHeapSnapShot = function(clientSocket) {
    try {
        if (!profiler) {
            ut.logger.error(agentSetting.currentTestRun, '| Cannot load cavisson-profiling-tool ,cavisson-profiling-tool value is :', profiler)
            agentSetting.isHeapDumpInProgress = false
            startTimer(clientSocket)
            return;
        }
        ut.logger.info(agentSetting.currentTestRun, "| profiler.takeHeapSnapShot , Taking heapsnapshot")
       
        /*
        1. If agent is busy in taking heap dump then agent will not send Heart beat msg to NDC,
        Because NDC will ignore that heartbeat and in that case agent will not rcv any heart beat reply,
         and after some threshold agent will close connection and make switchover
        2. NDC have timeout of 10 min for any request, so for each request agent pauses Heart beat interval for 10 min
         because if agent is sending any file that is taking more then 10 min to process, so agent will wait for complete transfer.
        * */

        clearTimeout(timeOutToStartHeartBeat) ; timeOutToStartHeartBeat= undefined
        if(!timeOutToStartHeartBeat){
            timeOutToStartHeartBeat = setTimeout(function(){
                startTimer(clientSocket)
            },600000)
        }
        var snapshot1 = profiler.takeSnapshot();

        var size =0,stream,chunked=0
        var gzip = zlib.createGzip();

        clientSocket.write("nd_meta_data_rep:action=get_heap_dump;Size=" + 0 + ";CompressMode=1\n")
        stream = snapshot1.export()
            .pipe(gzip)                         //This is faster because in pipes, transformes uses async function to transform and transmitt the data
            .on('error', function (e) {})
            .on('data', function (chunk) {
                size += chunk.length
                ++chunked
                var flag = (clientSocket.write(chunk), function (err) {
                })           //For back pressuring we are using data event ,not pipe
                if (!flag) {
                    stream.pause();
                    ut.logger.info(agentSetting.currentTestRun + "There will be no additional data for 0.5 second.");
                    setTimeout(function () {
                        ut.logger.info(agentSetting.currentTestRun + 'Now data will start flowing again.');
                        stream.resume();
                    }, 500);
                }
            })
            .on('end', function (chunk) {
                snapshot1.delete();
                clientSocket.write("nd_meta_data_rep:action=get_heap_dump;result=OK\n")
                ut.logger.info(agentSetting.currentTestRun + "nd_meta_data_rep:action=get_heap_dump;result=OK")
                ut.logger.info(agentSetting.currentTestRun + "Total dumped data : ", size,"chunked : ",chunked)
            })
    }
    catch(e){
        ut.logger.info(agentSetting.currentTestRun + "| Error occured during Taking HeapDump (error): "+e)
    }
}

v8_profiler.createData = function(sb,data) {
    sb.clear();

    sb.add(data);
    sb.add('\n')

    return sb;
}

v8_profiler.startCpuProfiling = function(clientSocket) {
    try {
        if (!profiler) {
            ut.logger.error(agentSetting.currentTestRun, '| Cannot load cavisson-profilling-tool ,cavisson-profilling-tool value is :', profiler)
            startTimer(clientSocket);
            return
        }
        ut.logger.info(agentSetting.currentTestRun, "| Starting cpuProfiling ");
        clearInterval(agentSetting.reconnectTimer)          //Clearing reconnect timer interval
        agentSetting.reconnectTimer = undefined;
        profiler.startProfiling('', true);
        setTimeout(function () {
            var profile1 = profiler.stopProfiling();
            var sb = new stringBuffer();
            profile1.export(function (err, data) {
                ut.logger.info(agentSetting.currentTestRun, '| Going to export CPU profiling data')
                if (err)
                    ut.logger.info(agentSetting.currentTestRun + "| Error in cpu_profiling : " + err);
                try {
                    var profilingData = v8_profiler.createData(sb, data).toString() + "\n";

                    if (profilingData.length) {

                        clientSocket.write("nd_meta_data_rep:action=get_thread_dump;Size=" + profilingData.length + ";CompressMode= "+(compressMode == false ? 0:1)+ "\n");
                        clientSocket.write(profilingData + "\n");
                        clientSocket.write("nd_meta_data_rep:action=get_thread_dump;result=Ok;" + "Size=" + profilingData.length + ";CompressMode= "+(compressMode == false ? 0:1) + "\n");
                        ut.logger.info(agentSetting.currentTestRun + " | Dumping cpu profiling data : \n" + profilingData.length);
                    }
                    else {
                        clientSocket.write("nd_meta_data_rep:action=get_thread_dump;result=Error:'<'Unable to take cpu_profiling please check in bci error log.>\n");
                        ut.logger.info(agentSetting.currentTestRun + " | Size of cpu profiling data is 0");
                    }
                    profile1.delete();
                    startTimer(clientSocket);
                }
                catch (err) {
                    startTimer(clientSocket);
                    ut.logger.warn(agentSetting.currentTestRun + "| Error in Dumping metarecord for Backend :" + err);
                }

            })
        }, agentSetting.nodejsCpuProfilingTime);                  //Profiling CPU for particular time
    }
    catch(e){
        startTimer(clientSocket);
        ut.logger.error("Error in CPU profiling",e)
    }
}

function startTimer(clientSocket){
    var conn = require('./controlmessage-handler')
    conn.startHealthCheckTimer(clientSocket);
}

module.exports = v8_profiler;
