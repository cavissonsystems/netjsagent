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
        clearInterval(agentSetting.reconnectTimer)          //Clearing reconnect timer interval
        agentSetting.reconnectTimer = undefined;
        var snapshot1 = profiler.takeSnapshot();
        var size = 0
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
                startTimer(clientSocket)
                ut.logger.error(agentSetting.currentTestRun + "Error in heap dump : ",e)
            }
        })
        stream.on('end', function () {
            try{
                clientSocket.write("nd_meta_data_rep:action=get_heap_dump;result=OK\n")
                ut.logger.info(agentSetting.currentTestRun + "nd_meta_data_rep:action=get_heap_dump;result=OK")
                ut.logger.info(agentSetting.currentTestRun + "Toatl dumped data : ", size)
                startTimer(clientSocket)
                agentSetting.isHeapDumpInProgress = false
                snapshot1.delete();
            }catch (e){
                agentSetting.isHeapDumpInProgress = false
                startTimer(clientSocket)
                ut.logger.error(agentSetting.currentTestRun + "Error in heap dump : ",e)
            }
        });
        stream.on('error', function (err) {
            ut.logger.error(agentSetting.currentTestRun + "Error in exporting heap data : ", err)
            agentSetting.isHeapDumpInProgress = false
            startTimer(clientSocket)
            snapshot1.delete();
        });
    }
    catch(e){
        startTimer(clientSocket)
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
