var agentSetting = require('../agent-setting');
var util = require('../util');
var samples = require('../nodetime/lib/samples');
var {Buffer} = require('buffer');
var {TDigest} = require('../utils/TDigest');
var backendDetails = require('../backend/backendDetails');

function ndIPPercentileMon(){}
ndIPPercentileMon.tdTimer = undefined;

ndIPPercentileMon.handleMonitor = function(){

    console.log(agentSetting.tDigestPercentileIP.enable,agentSetting.agentMode)
    1 == agentSetting.tDigestPercentileIP.enable ? (agentSetting.agentMode >= 2 ? ndIPPercentileMon.startMonitor() : ndIPPercentileMon.stopMonitor()) : ndIPPercentileMon.stopMonitor() ;
}

ndIPPercentileMon.aggInterval = function(){

    if(agentSetting.tDigestPercentileIP){
        let time = agentSetting.tDigestPercentileIP.aggInterval,t=undefined;
        if(time.indexOf('m') > -1){
            t = time.split('');
            t = Number(t[0]) * 60 * 1000;
        }else if(time.indexOf('hr') > -1){
            t = time.split('');
            t = Number(t[0]) * 60 * 60 * 1000;
        }
        return t;
    }
}

ndIPPercentileMon.startMonitor = function(){

    try{
        if(agentSetting.isTestRunning) {
            util.logger.info(agentSetting.currentTestRun, '| Starting ndIPPercentile Monitor , ll dump data after each ' + agentSetting.tDigestPercentileIP.aggInterval);
            if (ndIPPercentileMon.tdTimer == undefined){
                ndIPPercentileMon.tdTimer = setInterval(ndIPPercentileMon.dumpIPPercentileData , ndIPPercentileMon.aggInterval() );
            }
        }
    }catch(e){
        util.logger.error(agentSetting.currentTestRun,' |Error : IP startMonitor',e)
    }
}

ndIPPercentileMon.dumpIPPercentileData = function(){

   try{
       var keys = Object.keys(agentSetting.backendRecordMap);
       if (agentSetting.autoSensorConnHandler && agentSetting.autoSensorConnHandler.client) {
           if (keys.length != 0) {
               for (var i = 0; i < keys.length; i++) {

                   var backendrecordKey = keys[i];
                   var eachBackendData = agentSetting.backendRecordMap[keys[i]];
                   var data = ndIPPercentileMon.generate96recordForEveryBackend(eachBackendData)

                   if(data){
                       samples.toBuffer(data);
                       backendDetails.prototype.reset();
                       
                   }
                   if(agentSetting.enableBTMonitorTrace > 0) 
                       util.logger.info(agentSetting.currentTestRun,' | Dumping 96 Record For Every IP :',data)
                   
                   data = undefined;
               }

           }
       }
   }catch(e){
       util.logger.error(agentSetting.currentTestRun,'| Error in dumpIPPercentileData',e)
   }
}

ndIPPercentileMon.generate96recordForEveryBackend = function(backendData){
    try{

        if(backendData && backendData.td.size() > 0){
            var timestamp = new Date().getTime() - agentSetting.cavEpochDiffInMills;
            var tDigestBinSize = backendDetails.prototype.getSize(backendData);

            var ndIPPercentileIntial =
                '96,'+agentSetting.tierID+
                '|'+agentSetting.appID+
                '|'+agentSetting.tDigestPercentileIP.groupId+
                '|'+agentSetting.tDigestPercentileIP.graphId+
                ':'+agentSetting.vectorPrefix+backendData.BackendName+
                ','+timestamp+','+tDigestBinSize+
                '\n';

            var legth96 = ndIPPercentileIntial.length;
            var buf = new Buffer.allocUnsafe(tDigestBinSize + legth96 + 1);
            buf.fill(0);
            var offset = buf.write(ndIPPercentileIntial,0,legth96);

            var ofst = ndIPPercentileMon.tDigest(backendData,buf,offset);
            buf.write('\n',ofst,1);

            return buf;
        }

    }catch(e){
        util.logger.error(agentSetting.currentTestRun,'| Error in generate96recordForEveryBackend',e)
    }
}

ndIPPercentileMon.tDigest = function(backend,buf,offset){

    try{
        backend.td.compress();
        var tdata = undefined
        if(agentSetting.tDigestPercentileIP.sMode == 1){

            tdata = backend.td.asBytes(buf,offset);
          
        }else if(agentSetting.tDigestPercentileIP.sMode == 2){

            tdata = backend.td.asSmallBytes(buf,offset);
          
        }

       if(agentSetting.enableBciDebug > 1){
           util.logger.info(agentSetting.currentTestRun, '| IP Percentile for Backend ' + backend.BackendName + " 80% : "  + backend.td.percentile(0.80))
           util.logger.info(agentSetting.currentTestRun, '| IP Percentile for Backend ' + backend.BackendName + " 85% : "  + backend.td.percentile(0.85))
           util.logger.info(agentSetting.currentTestRun, '| IP Percentile for Backend ' + backend.BackendName + " 90% : "  + backend.td.percentile(0.90))
           util.logger.info(agentSetting.currentTestRun, '| IP Percentile for Backend ' + backend.BackendName + " 95% : "  + backend.td.percentile(0.95))
           util.logger.info(agentSetting.currentTestRun, '| IP Percentile for Backend ' + backend.BackendName + " 99% : "  + backend.td.percentile(0.99))

       }
        return tdata;
    }catch(e){
        util.logger.error(agentSetting.currentTestRun,'| Error in tDigest',e)
    }
}

ndIPPercentileMon.stopMonitor = function(){

    try{
        util.logger.info(agentSetting.currentTestRun,'| Stoping ndIPPercentile Monitor');
        clearInterval(ndIPPercentileMon.tdTimer);
        ndIPPercentileMon.tdTimer = undefined;
    }catch(e){
        util.logger.error(agentSetting.currentTestRun,'| Error While stopping bdIPPercentile Monitor');
    }
}

module.exports = ndIPPercentileMon;