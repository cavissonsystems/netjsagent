/**
 * Created by Sahil on 6/23/16.
 */

var mkdirp = require('mkdirp');
var nt = require('../nodetime');
var proxy = require('../proxy');
var samples = require('../samples');
var cluster = require('cluster');
var AgentSetting = require("../../../agent-setting");
var fs = require('fs');
var ut = require('../../../util');

module.exports = function(obj)
{
    try {
        var clusterDirExists = false;
        proxy.after(obj, 'fork', function (obj, args, ret) {
            var id = 0;

            for (id in obj.workers) {
                var worker = obj.workers[id];
                worker.__cavissonID = id;
            }

            var clusterPath = '/tmp/cavisson/cluster';

            if (clusterDirExists) {
                writeClusterFile();
            }
            else if (fs.existsSync(clusterPath)) {
                clusterDirExists = true;
                writeClusterFile();
            }
            else {
                mkdirp(clusterPath, function (err) {
                    if (err) throw err;
                    clusterDirExists = true;
                    writeClusterFile();
                });
            }

            function writeClusterFile() {
                ut.logger.info(AgentSetting.currentTestRun+" | Cluster pid file is created for pid : " + ret.process.pid+" at : "+clusterPath);

                fs.writeFile(clusterPath + '/' + worker.__cavissonID + '.pid', ret.process.pid, function (err) {
                    if (err)console.log(err);
                });
            }
        });
    }
    catch(err){ut.logger.warn(err)}
};