
var agentSetting = require('./../agent-setting');
var util = require('../util');
var btManager = require('./../BT/btManager');
var samples = require('../nodetime/lib/samples');
var {Buffer} = require('buffer');
var {TDigest} = require('../utils/TDigest');
var btDetails = require('../BT/BTDetails');

ndBTPercentileMon.tdTimer = undefined;

function ndBTPercentileMon() {}

ndBTPercentileMon.handleMonitor = function(){

    1 == agentSetting.tDigestPercentileBT.enable ? ( agentSetting.agentMode >= 2 ? ndBTPercentileMon.startMonitor() : ndBTPercentileMon.stopMonitor() ) : ndBTPercentileMon.stopMonitor() ;
}

ndBTPercentileMon.aggInterval = function(){
    
    if(agentSetting.tDigestPercentileBT){
        let time = agentSetting.tDigestPercentileBT.aggInterval,t=undefined;
        if(time.indexOf('m') > -1){
            t = time.split('m');
            t = Number(t[0]) * 60 * 1000;
        }else if(time.indexOf('h') > -1){
            t = time.split('h');
            t = Number(t[0]) * 60 * 60 * 1000;
        }
        return t;
    }
}

ndBTPercentileMon.startMonitor = function(){
    try{
        if(agentSetting.isTestRunning) {
            util.logger.info(agentSetting.currentTestRun, '| Starting ndBTPercentile Monitor , ll dump data after each ' + agentSetting.tDigestPercentileBT.aggInterval);
            if (ndBTPercentileMon.tdTimer == undefined){
                ndBTPercentileMon.tdTimer = setInterval(ndBTPercentileMon.dumpBTPercentileData , ndBTPercentileMon.aggInterval() );
            }
        }
    }catch(e){
        console.log('Error : Bt startMonitor')
    }
}

ndBTPercentileMon.dumpBTPercentileData = function(){
    try{

        if(agentSetting.autoSensorConnHandler && agentSetting.autoSensorConnHandler.client){
            var map = btManager.getbtMonCountersMap();
            var keys = Object.keys(map);

            var tdAll = new btDetails();

            for (var i in keys) {
                var bt = map[keys[i]];
                var btId = keys[i];
                if (bt) {
                    var data = ndBTPercentileMon.generate96RecordForEveryBT(bt, btId)
                    tdAll.updateForTDAllTransation(bt);
                    if(data){
    
                        samples.toBuffer(data);
                        btDetails.prototype.resetTD(bt);
                    }
                    if(agentSetting.enableBTMonitorTrace > 0) 
                        util.logger.info(agentSetting.currentTestRun,' | Dumping 96 Record For Every BT :',data)
                    data = undefined;
                
                }
            }
            if(tdAll.BTID !== undefined){

                var OverAllTDdata = ndBTPercentileMon.generate96RecordForEveryBT(tdAll, tdAll.BTID);
                samples.toBuffer(OverAllTDdata);
                btDetails.prototype.resetTD(tdAll);
                OverAllTDdata=undefined;
            }
        }
    }catch(e){
        console.log('Error in dump96record :',e)
    }
}

ndBTPercentileMon.generate96RecordForEveryBT = function(bt,btID){
    try{

       if(bt.td && bt.td.size() > 0){
           var timestamp = new Date().getTime() - agentSetting.cavEpochDiffInMills;
           var tdigestBinSize = btDetails.prototype.getTDSize(bt);
           var ndBTPercentileIntial =
               '96,'+agentSetting.tierID+
               '|'+agentSetting.appID+
               '|'+agentSetting.tDigestPercentileBT.groupId+
               '|'+agentSetting.tDigestPercentileBT.graphId+
               ':'+agentSetting.vectorPrefix+bt.BTName+
               ','+timestamp+','+tdigestBinSize+
               '\n';

           var length96 = ndBTPercentileIntial.length;
           var buf = new Buffer.allocUnsafe( tdigestBinSize + length96 + 1 );
           buf.fill(0);
           var offset = buf.write(ndBTPercentileIntial,0,length96);

           var ofst = ndBTPercentileMon.tDigest(bt,buf,offset);
           buf.write('\n',ofst,1);
           
           return buf;
       }
    }catch(e){
        util.logger.error(agentSetting.currentTestRun,'| Error in Generating 69 record',e)
    }
};

ndBTPercentileMon.tDigest = function(bt,buf,offset){

    try{
        
        bt.td.compress();
        var tdata = undefined;
        if(agentSetting.tDigestPercentileBT.sMode == 1){
            tdata = bt.td.asBytes(buf,offset);
         
        }else if(agentSetting.tDigestPercentileBT.sMode == 2){
            tdata = bt.td.asSmallBytes(buf,offset);
           
        }

       if(agentSetting.enableBciDebug > 1){
           util.logger.info(agentSetting.currentTestRun, '| BT Response Array for BT :'+bt.BTName,' : '+bt.resArray)
           util.logger.info(agentSetting.currentTestRun, '| BT Percentile for BT ' + bt.BTName + " 80% : "  + bt.td.percentile(0.80))
           util.logger.info(agentSetting.currentTestRun, '| BT Percentile for BT ' + bt.BTName + " 85% : "  + bt.td.percentile(0.85))
           util.logger.info(agentSetting.currentTestRun, '| BT Percentile for BT ' + bt.BTName + " 90% : "  + bt.td.percentile(0.90))
           util.logger.info(agentSetting.currentTestRun, '| BT Percentile for BT ' + bt.BTName + " 95% : "  + bt.td.percentile(0.95))
           util.logger.info(agentSetting.currentTestRun, '| BT Percentile for BT ' + bt.BTName + " 99% : "  + bt.td.percentile(0.99))

       }
       return tdata;

    }catch(e){
        tdata = undefined;
       util.logger.error(agentSetting.currentTestRun,'| Error in making tdigest Binary');
    }
}


ndBTPercentileMon.stopMonitor = function(){
    
    try{
        util.logger.info(agentSetting.currentTestRun,'| Stoping ndBTPercentile Monitor');
        clearInterval(ndBTPercentileMon.tdTimer);
        ndBTPercentileMon.tdTimer = undefined;
    }catch(e){
        util.logger.error(agentSetting.currentTestRun,'| Error While stopping bdBTPercentile Monitor');
    }
}

module.exports = ndBTPercentileMon;