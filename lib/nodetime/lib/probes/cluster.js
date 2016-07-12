/**
 * Created by Sahil on 6/23/16.
 */


var nt = require('../nodetime');
var proxy = require('../proxy');
var samples = require('../samples');
var cluster = require('cluster');
var AgentSetting = require("../../../agent-setting");
var fs = require('fs');

module.exports = function(obj)
{
    var clusterDirExists = false;
    proxy.after(obj , 'fork' , function(obj,args,ret) {
        var id = 0;

        for (id in obj.workers) {
            var worker = obj.workers[id];
            worker.__cavissonID = id;
        }

        var clusterPath = '/tmp/cavisson/cluster';

        if (clusterDirExists) {
            writeClusterFile();
        }
        else if(fs.existsSync(clusterPath)) {
            clusterDirExists = true;
            writeClusterFile();
        }
        else{
            fs.mkdirSync(clusterPath);
            clusterDirExists = true;
            writeClusterFile();
        }

        function writeClusterFile() {
            fs.writeFile(clusterPath + '/' + worker.__cavissonID + '.pid', ret.process.pid, function (err) {
                if (err)console.log(err);
            });
        }
    });
};