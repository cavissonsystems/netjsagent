/**
 * Created by Sahil on 7/29/16.
 */


var fs = require('fs');
var profiler = require('v8-profiler');
var stringBuffer = require('./flowpath/StringBuffer.js').StringBuffer;
var agentSetting = require('./agent-setting.js');
var ut = require('./util');

function v8_profiler ()
{

}

v8_profiler.takeHeapSnapShot = function(filePath,clientSocket)
{
    var snapshot1 = profiler.takeSnapshot();

        var sb = new stringBuffer();
        snapshot1.export(function (err, data) {
            try {
                if (err)
                    ut.logger.info(agentSetting.currentTestRun+" | error in taking snapshot : "+err);

                if (data) {
                    if(!fs.existsSync(filePath))
                    {
                        fs.writeFile(filePath,data,function(err){if (err)console.log(err)});
                        var respMessage = "nd_meta_data_rep:action=get_heap_dump;result=Ok:<Started....Please check BCI Debug/Error logs for more details & also check  " + filePath + " where heapdumps are captured.>;\n";
                        clientSocket.write(respMessage);
                        ut.logger.info(agentSetting.currentTestRun+" | Heap dump taken successfully at : "+filePath);
                    }
                }
                else {
                    clientSocket.write("nd_meta_data_rep:action=get_thread_dump;result=Error:'<'Unable to take heapDump please check in bci error log.>\n");
                    ut.logger.warn(agentSetting.currentTestRun+" | Error in taking Heap dump ");
                }
                snapshot1.delete();
            }
            catch (err) {
                ut.logger.warn(agentSetting.currentTestRun+" | Error in taking Heap dump :" + err);
            }

        })
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
    profiler.startProfiling('', true);
	ut.logger.info("cpuProfiling is start");
    setTimeout(function () {
        var profile1 = profiler.stopProfiling();
	ut.logger.info("Invoking stop cpuProfiling");
        var sb = new stringBuffer();

        profile1.export(function (err, data) {
            if(err)
                ut.logger.info(agentSetting.currentTestRun+" | Error in cpu_profiling : "+err);
            try {
                var profilingData = v8_profiler.createData(sb, data).toString() +"\n";

                if (profilingData.length) {

                    clientSocket.write("nd_meta_data_rep:action=get_thread_dump;Size=" + profilingData.length +";CompressMode=+(compressMode == false ? 0:1);" + "\n");
                    clientSocket.write(profilingData + "\n");
                    clientSocket.write("nd_meta_data_rep:action=get_thread_dump;result=Ok;" + "Size=" + profilingData.length +";CompressMode=+(compressMode == false ? 0:1);" + "\n");
                    ut.logger.info(agentSetting.currentTestRun+" | Dumping cpu profiling data : \n" + profilingData);
                }
                else{
                    clientSocket.write("nd_meta_data_rep:action=get_thread_dump;result=Error:'<'Unable to take cpu_profiling please check in bci error log.>\n");
                    ut.logger.info(agentSetting.currentTestRun+" | Size of cpu profiling data is 0");
                }
                profile1.delete();

            }
            catch (err) {
                console.log(err)
                ut.logger.warn(agentSetting.currentTestRun+" | Error in Dumping metarecord for Backend :" + err);
            }

        })
    }, 5000);                  //4 minutes
}

module.exports = v8_profiler;

