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
        var size = 0, stream;
        var gzip = zlib.createGzip();
        clientSocket.write("nd_meta_data_rep:action=get_heap_dump;Size=" + 0 + ";CompressMode=1\n");
        /*stream = snapshot1.export()
            .pipe(gzip)                         //This is faster because in pipes, transformes uses async function to transform and transmitt the data
            .on('error', function(e){console.log(e)})
            .on('data',function(chunk){
                size = chunk.length
                var flag = (clientSocket.write(chunk), function (err) {})           //For back pressuring we are using data event ,not pipe
                if (!flag) {
                    stream.pause();
                    ut.logger.info(agentSetting.currentTestRun + "There will be no additional data for 0.5 second.");
                    setTimeout(function () {
                        ut.logger.info(agentSetting.currentTestRun + 'Now data will start flowing again.');
                        stream.resume();
                    }, 500);
                }
            })
            .on('end',function(chunk){
                snapshot1.delete();
                clientSocket.write("nd_meta_data_rep:action=get_heap_dump;result=OK\n")
                ut.logger.info(agentSetting.currentTestRun + "nd_meta_data_rep:action=get_heap_dump;result=OK")
                ut.logger.info(agentSetting.currentTestRun + "Toatl dumped data : ", size)
            })
        */
        stream = snapshot1.export();
        stream.pipe(gzip).pipe(clientSocket,{end:false}).on('error',function(e){console.log(e)})
            .on('end',function(){
                snapshot1.delete();
                setTimeout(function() {
                    clientSocket.write("nd_meta_data_rep:action=get_heap_dump;result=OK\n")
                },100)
                ut.logger.info(agentSetting.currentTestRun + "nd_meta_data_rep:action=get_heap_dump;result=OK")
                ut.logger.info(agentSetting.currentTestRun + "Toatl dumped data : ", size)
            })
        //This is faster because in pipes, transformes uses async function to transform and transmitt the data

        /*stream.on('data', function (chunk) {
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
        })*/
        /*stream.on('end', function () {
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
        });*/
     /*   stream.on('error', function (err) {
            ut.logger.error(agentSetting.currentTestRun + "Error in exporting heap data : ", err)
            agentSetting.isHeapDumpInProgress = false
            snapshot1.delete();
        });*/
    }
    catch(e){
        agentSetting.isHeapDumpInProgress = false
        ut.logger.error(agentSetting.currentTestRun + "Error in heap dump : ",e)
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
