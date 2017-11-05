/**
 * Created by Sahil on 7/29/16.
 */
var fs = require('fs'),
    Readable = require('stream').Readable,
    zlib = require('zlib');
var profiler
try {
    profiler = require('v8-profiler');
}catch(e){console.log("Can't find module v8-profiler ")}

var stringBuffer = require('./flowpath/StringBuffer.js').StringBuffer;
var agentSetting = require('./agent-setting.js');
var ut = require('./util');
var gzip = zlib.createGzip();
var timeOutToStartHeartBeat = undefined
function v8_profiler () {}

v8_profiler.takeHeapSnapShot = function(clientSocket)
{
    try {
        if (!profiler) {
            ut.logger.error(agentSetting.currentTestRun, '| Cannot load v8-profiler ,V8-profiler value is :', profiler)
            agentSetting.isHeapDumpInProgress = false
            startTimer(clientSocket)
            return;
        }
        ut.logger.info(agentSetting.currentTestRun, "| v8_profiler.takeHeapSnapShot , Taking heapsnapshot")
        /*
        1. If agent is busy in taking heap dump then agent will not send Heart beat msg to NDC,
        Because NDC will ignore that heartbeat and in that case agent will not rcv any heart beat reply,
         and after some threshold agent will close connection and make switchover
        2. NDC have timeout of 10 min for any request, so for each request agent pauses Heart beat interval for 10 min
         because if agent is sending any file that is taking more then 10 min to process, so agent will wait for complete transfer.
        * */

        clearInterval(agentSetting.reconnectTimer) ;agentSetting.reconnectTimer = undefined;     //Clearing reconnect timer interval
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
                .on('error', function (e) {
                    console.log(e)
                })
                .on('data', function (chunk) {
                    size += chunk.length
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
                    ut.logger.info(agentSetting.currentTestRun + "Toatl dumped data : ", size)
                })
        }
	catch(e){
		ut.logger.info(agentSetting.currentTestRun + " Error occured during Taking HeapDump (error): "+e)
	}
        /*
            clientSocket.write("nd_meta_data_rep:action=get_heap_dump;Size=" + 0 + ";CompressMode=1\n");
            var stream = snapshot1.export();
            stream.on('data', function (chunk) {
                try {
                    size += chunk.length;
                    var flag = (clientSocket.write(zlib.gzipSync(chunk)), function (err) {
                    })
                    if (!flag) {
                        stream.pause();
                        ut.logger.info(agentSetting.currentTestRun + "There will be no additional data for 0.5 second.");
                        setTimeout(function () {
                            ut.logger.info(agentSetting.currentTestRun + 'Now data will start flowing again.');
                            stream.resume();
                        }, 500);
                    }
                }catch (e){
                    agentSetting.isHeapDumpInProgress = false
                    ut.logger.error(agentSetting.currentTestRun + "Error in heap dump : ",e)
                }
            })
            stream.on('end', function () {
                try{
                    clientSocket.write("nd_meta_data_rep:action=get_heap_dump;result=OK\n")
                    ut.logger.info(agentSetting.currentTestRun + "nd_meta_data_rep:action=get_heap_dump;result=OK")
                    ut.logger.info(agentSetting.currentTestRun + "Toatl dumped data : ", size)
                    agentSetting.isHeapDumpInProgress = false
                    snapshot1.delete();
                }catch (e){
                    agentSetting.isHeapDumpInProgress = false
                    ut.logger.error(agentSetting.currentTestRun + "Error in heap dump : ",e)
                }
            });
            stream.on('error', function (err) {
                ut.logger.error(agentSetting.currentTestRun + "Error in exporting heap data : ", err)
                agentSetting.isHeapDumpInProgress = false
                snapshot1.delete();
            });
        } 
        catch(e){
            agentSetting.isHeapDumpInProgress = false
            ut.logger.error(agentSetting.currentTestRun + "Error in heap dump : ",e)
        }

        /*        snapshot1.export(function (err, data) {
         try {
         ut.logger.info(agentSetting.currentTestRun,"| v8_profiler.takeHeapSnapShot , Exporting heapsnapshot")
         if (err)
         ut.logger.info(agentSetting.currentTestRun+" | error in taking snapshot : "+err);

         if (data) {
         //Compressing data,to send over socket
         zlib.gzip(data, function (error, result) {
         if (error) throw error;
         var readStream = new Readable();            //Creating stream Object
         readStream.push(result);                   //Adding zip data in stream, because on socket data should be in small chunks ,so stream will give data in chunks
         readStream.push(null);                      //If null is not added in stream then , stream._read event will not call
         sendHeapDumpToNdc(readStream,result.length)
         })
         function sendHeapDumpToNdc(readStream,length){
         readStream.on('error',function(err){
         ut.logger.info(agentSetting.currentTestRun + " |Error in Reading Heap dump Data from stream",err)
         })

         clientSocket.write("nd_meta_data_rep:action=get_heap_dump;Size="+0+";CompressMode=1\n");
         var size= 0;
         readStream.on('data',function(chunk){
         ut.logger.info(agentSetting.currentTestRun + " |sending chunk to ndc " + chunk.length);
         size += chunk.length
         var flag = clientSocket.write(chunk, function (err) {})
         if (!flag) {
         readStream.pause();
         ut.logger.info(agentSetting.currentTestRun + "There will be no additional data for 1 second.");
         setTimeout(function () {
         ut.logger.info(agentSetting.currentTestRun + 'Now data will start flowing again.');
         readStream.resume();
         }, 1000);
         }
         })

         readStream.on('end',function(){
         clientSocket.write("nd_meta_data_rep:action=get_heap_dump;result=OK")
         ut.logger.info(agentSetting.currentTestRun+" |end event received. Data sent successfully,Total data  ",size);
         })
         }
         }
         else {
         clientSocket.write("nd_meta_data_rep:action=get_heap_dump;result=Error:'<'Unable to take heapDump please check in bci error log.>\n");
         ut.logger.warn(agentSetting.currentTestRun+" | Error in taking Heap dump ");
         }
         snapshot1.delete();
         }
         catch (err) {
         ut.logger.warn(agentSetting.currentTestRun+" | Error in taking Heap dump :" + err);
         }

         })*/
}

v8_profiler.takeHeapSnapShotOnNewConn = function(clientSocket,dataSocket,clientMsg){

    try {
        if (!profiler) {
            ut.logger.error(agentSetting.currentTestRun, '| Cannot load v8-profiler ,V8-profiler value is :', profiler)
            agentSetting.isHeapDumpInProgress = false
            startTimer(clientSocket)
            return;
        }
        ut.logger.info(agentSetting.currentTestRun, "| v8_profiler.takeHeapSnapShot , Taking heapsnapshot On New Connection")

        var snapshot1 = profiler.takeSnapshot();
        var size =0,stream,chunked=0,asyncId;
        var gzip = zlib.createGzip();

        asyncId = clientMsg.split(';')[1].split('=')[1]
	
        var successMsg = "run_async_command_rep:Id="+asyncId+";Result=Success;\n"
        clientSocket.write(successMsg)

        var newDataMsg = "run_async_command_data_req:Command=nd_meta_data_rep:action=get_heap_dump;Id="+asyncId+";Tier="+agentSetting.tier+";Server="+agentSetting.server+";Instance="+agentSetting.instance+";Size=0;\n"
        dataSocket.write(newDataMsg)
        dataSocket.write("Complete\n")
	
       stream = snapshot1.export()
            .pipe(gzip)                         //This is faster because in pipes, transformes uses async function to transform and transmitt the data
            .on('error', function (e) {
                console.log(e)
            })
            .on('data', function (chunk) {
                size += chunk.length
                ++chunked
                var flag = (dataSocket.write(chunk), function (err) {
                })
                //For back pressuring we are using data event ,not pipe
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
                ut.logger.info(agentSetting.currentTestRun + " End event Reached , closing the New Data Connection")
                setTimeout(function () {
                    dataSocket.closeConnection();
                    delete dataSocket;
                },2000)
                ut.logger.info(agentSetting.currentTestRun + "Total dumped data : ", size,"chunked : ",chunked)
            })
    }
    catch (e){
	ut.logger.info(agentSetting.currentTestRun + " Error occured during Taking HeapDump (error): "+e)	      
    }
}

v8_profiler.createData = function(sb,data)
{
    sb.clear();

    sb.add(data);
    sb.add('\n')

    return sb;
}

v8_profiler.startCpuProfiling = function(clientSocket)
{
    try {
        if (!profiler) {
            ut.logger.error(agentSetting.currentTestRun, '| Cannot load v8-profiler ,V8-profiler value is :', profiler)
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
                    ut.logger.info(agentSetting.currentTestRun + " | Error in cpu_profiling : " + err);
                try {
                    var profilingData = v8_profiler.createData(sb, data).toString() + "\n";

                    if (profilingData.length) {

                        clientSocket.write("nd_meta_data_rep:action=get_thread_dump;Size=" + profilingData.length + ";CompressMode=+(compressMode == false ? 0:1);" + "\n");
                        clientSocket.write(profilingData + "\n");
                        clientSocket.write("nd_meta_data_rep:action=get_thread_dump;result=Ok;" + "Size=" + profilingData.length + ";CompressMode=+(compressMode == false ? 0:1);" + "\n");
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
                    ut.logger.warn(agentSetting.currentTestRun + " | Error in Dumping metarecord for Backend :" + err);
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
