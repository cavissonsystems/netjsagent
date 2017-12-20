/**
 * Created by Sahil on 7/29/16.
 */
var fs = require('fs'),
    Readable = require('stream').Readable,
    zlib = require('zlib');
var profiler
try {
    profiler = require('cavisson-profiling-tool');
}catch(e){console.log("Can't find module cavisson-profiling-tool ")}
var stringBuffer = require('./flowpath/StringBuffer.js').StringBuffer;
var agentSetting = require('./agent-setting.js');
var ut = require('./util');
var timeOutToStartHeartBeat = undefined
function v8_profiler () {}

v8_profiler.takeHeapSnapShot = function(clientSocket)
{
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

v8_profiler.takeHeapSnapShotOnNewConn = function(clientSocket,dataSocket,clientMsg,asyncId,command){

    try {

        if (!profiler) {
            ut.logger.error(agentSetting.currentTestRun, '| Cannot load cavisson-profiling-tool ,cavisson-profiling-tool value is :', profiler)
            return;
        }
        ut.logger.info(agentSetting.currentTestRun, "| v8_profiler.takeHeapSnapShot , Taking heapsnapshot On New Connection")

        var snapshot1 = profiler.takeSnapshot();
        var stream,
            gzip = zlib.createGzip();

        clientSocket.write("run_async_command_rep:Id=" + asyncId + ";Result=Success;\n")
        dataSocket.write("run_async_command_data_req:Command=" + command + ";Id=" + asyncId + ";Tier=" + agentSetting.tier + ";Server=" + agentSetting.server + ";Instance=" + agentSetting.instance + ";Size=-1;\n")
        dataSocket.write("Complete\n")
        stream = snapshot1.export()                 //Using pipe API , as it handles the backpressure and End event internally. #stream ==>gzip ==>socket#
            .pipe(gzip).pipe(dataSocket.client).on('error', function (e) {
                ut.logger.info(agentSetting.currentTestRun + "| Error occured during Taking HeapDump (Piping ERROR): "+e)
            })
        stream.on('end', function () {
                ut.logger.info(agentSetting.currentTestRun + "| End event Reached For heapsnapshot stream")
                snapshot1.delete();
            })
        /*stream = snapshot1.export()
        stream.pipe(gzip).pipe(dataSocket.client,{end:true}).on('error', function (e) {
            ut.logger.info(agentSetting.currentTestRun + "| Error occured during Taking HeapDump (Piping ERROR): "+e)
        })
        stream.on('end', function () {
            var rs = new Readable()
            rs.push("nd_meta_data_rep:action=get_heap_dump;result=OK\n")
            rs.on('end',function(){console.log('-------END Event Came for laste stream')})
            rs.pipe(dataSocket.client,{end:true}).on('end',function(){console.log('-------END Event Came for laste token')})
            console.log(rs)
            rs.on('unpipe',function(){console.log('-----UNPIPE COME----');dataSocket.closeConnection();})
            ut.logger.info(agentSetting.currentTestRun + "| End event Reached For heapsnapshot stream")
            snapshot1.delete();
        })*/
        }
        catch (e){
            if(snapshot1)
                snapshot1.delete();
            dataSocket.closeConnection();
            delete dataSocket;
            ut.logger.info(agentSetting.currentTestRun + "| Error occured during Taking HeapDump (Catch): "+e)
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
