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

v8_profiler.takeHeapSnapShot = function(clientSocket)
{
    var snapshot1 = profiler.takeSnapshot();
    setTimeout(function () {
        var sb = new stringBuffer();
        snapshot1.export(function (err, data) {
            try {
                if (err)
                    throw err;

                var profilingData = v8_profiler.createData(sb, data).toString();

                if (profilingData.length) {
                    clientSocket.write(profilingData);
                    clientSocket.write("nd_meta_data_rep:action=get_thread_dump;result=Ok;" + "Size=" + profilingData.length + ";CompressMode=+(compressMode == false ? 0:1)+;\n");
                }
                else {
                    clientSocket.write("nd_meta_data_rep:action=get_thread_dump;result=Error:'<'Unable to take threaddump please check in bci error log.>\n");
                }
                snapshot1.delete();
            }
            catch (err) {
                ut.logger.warn("Error in Dumping metarecord for Backend :" + err);
            }

        })
    },60000);

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
    setTimeout(function () {
        var profile1 = profiler.stopProfiling();
        var sb = new stringBuffer();

        profile1.export(function (err, data) {
            if(err)
                throw err;
            try {
                var profilingData = v8_profiler.createData(sb, data).toString();

                ut.logger.info("Dumping MetaRecord for Query : " + profilingData);
                if (profilingData.length) {
                    clientSocket.write(profilingData);
                    clientSocket.write("nd_meta_data_rep:action=get_thread_dump;result=Ok;" + "Size=" + profilingData.length +";CompressMode=+(compressMode == false ? 0:1)+;\n");
                }
                else{
                    clientSocket.write("nd_meta_data_rep:action=get_thread_dump;result=Error:'<'Unable to take threaddump please check in bci error log.>\n");
                }
                profile1.delete();

            }
            catch (err) {
                console.log(err)
                ut.logger.warn("Error in Dumping metarecord for Backend :" + err);
            }

        })
    }, 3000);
}

module.exports = v8_profiler;

