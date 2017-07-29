/**
 * Created by Siddhant on 26-09-2016.
 */
var threshold = require('./threshold');
var btObj = require('./btObj');
//var btConfig = require('./btConfig');
var samples = require('../nodetime/lib/samples');
var btDetails = require('./BTDetails');
var util = require('../util');
var agentSetting = require('../agent-setting')											  

//Map used to store BT details information
//KEY- BT Name  Value- bt thresold object btObj
var btNameMap = new Object();
//Map used to store BT monitoring data per buiseness transaction
// KEY- BT Id Value- BTDetails object
var btMonCountersMap = new Object(),
    btThresholdMap = {};                            //Map used to store BT threshold data per buiseness transaction

btManager.btIdvsNameMap={};                         //Initializing idvsname map for get btObj on basis of btId(Harendra)

function btManager (){};

btManager.getBtObj = function(key){              //map[(BTName),(BTObject)]
    return btNameMap[key];
};

btManager.getThresholdObj = function(key){              //map[(BTName),(BTObject)]
    return btThresholdMap[key];
};

btManager.getBtID = function(name){      //for getting BTName based on Id
    return btNameMap[name].btId;
};

btManager.insertBTInThresholdMap= function (id, name, threshold){
    var bt = new btObj(id, name, threshold);
    btThresholdMap[name] = bt;
    return bt;
};

btManager.insertBT= function (id, name, threshold, btIncluMode){
    var bt = new btObj(id, name, threshold, btIncluMode);
    btNameMap[name] = bt;
    return bt;
};

btManager.insertID = function(name, id){
    btNameMap[name].btId = id;
    //samples.add('7,' + id + "," + name + "\n");     //todo check include Mode
};

btManager.dumpBt = function(id, name){
    samples.add('7,' + id + "," + name + "\n");     //todo check include Mode
};

btManager.dumpAll = function(){
    var keys = Object.keys(btNameMap)
    var resetBtRecord = "11," + (new Date().getTime() - agentSetting.cavEpochDiff * 1000) + ",7\n";
    if(agentSetting.dataConnHandler) {
        samples.add(resetBtRecord);
        util.logger.info(agentSetting.currentTestRun, "| Resetting BT, sending bt meta record : ", resetBtRecord)
    }
    for (var i in keys){
        var str = '7,' + btNameMap[keys[i]].btId + "," + btNameMap[keys[i]].btName + "\n";
        if(agentSetting.dataConnHandler)
            samples.add(str);
        if(btNameMap[keys[i]].btName.toUpperCase() !== 'ALL')
            btManager.createAndUpdateBTRecord(btNameMap[keys[i]].btId,btNameMap[keys[i]].btName,undefined,"","","","");//If BT object is not created then create it at once

        if(agentSetting.enableBTMonitorTrace > 0)
            util.logger.info(agentSetting.currentTestRun,' | Dumping BT 7 Record : ',str)
    }
};

btManager.getKey = function(value){      //for getting BTName based on Id
    var key;
    var keys = Object.keys(btNameMap);
    for( var i = 0; i< keys.length; i++) {
        if(btNameMap[keys[i]].btId == value && btNameMap[keys[i]].btIncluMode == 0){
            key = keys[i];
        }
    };
    return key;
};

btManager.getAll = function(){
 var data = [];
 var record = "na";
 for (var i in btNameMap) {
     if (btNameMap[i].btIncluMode == 0) { //No need to dump 7 record if excludeMode is 1.
         record = '7' + "," + btNameMap[i].btId + "," + btNameMap[i].btName + '\n';
         data.push(record);
     }
 }
 return data;

 };


btManager.getLength = function(){
    return Object.keys(btNameMap).length;
};

btManager.createAndUpdateBTRecord = function (btId, btName, respTime, cat, statusCode, slowPct, verySlowPct, reqContLength,resContLength) {
    try {
        if (btMonCountersMap[btId] == undefined) {
		    if(agentSetting.enableBTMonitorTrace > 0)
                util.logger.info(agentSetting.currentTestRun,' | Creating BT Record for :',btId)
            btManager.createBTRecord(btId, btName, respTime, cat, statusCode, slowPct, verySlowPct, reqContLength,resContLength);
        } else {
			if(agentSetting.enableBTMonitorTrace > 0)
                util.logger.info(agentSetting.currentTestRun,' | Updating BT Record for :',btId)																						
            btManager.updateBTRecord(btId, btName, respTime, cat, statusCode, slowPct, verySlowPct, reqContLength,resContLength);
        }
    }catch(err){
         util.logger.warn(err);
    }
}

btManager.createBTRecord = function(newID,newName,respTime,cat,statusCode, slowPct, verySlowPct, reqContLength,resContLength){

    try {
        var btd = new btDetails();
        btd.createBTRecord(newID, newName, respTime, cat, statusCode, slowPct, verySlowPct, reqContLength,resContLength);
        btMonCountersMap[newID] = btd;
    }catch(err){
        util.logger.warn(err);
    }
}

btManager.updateBTRecord = function (btId, btName, respTime, cat, statusCode, slowPct, verySlowPct, reqContLength,resContLength) {
    var btdetails = btMonCountersMap[btId];
    btdetails.updateBTDetail(respTime, cat, statusCode, reqContLength,resContLength);
}

btManager.getBTKey = function() {
    return Object.keys(btMonCountersMap);
};

btManager.getbtMonCountersMap = function() {
    return btMonCountersMap;
};

btManager.getBTData = function(key){
    return btMonCountersMap[key];
}

btManager.deleteBTRecord = function(key){
    try {
        delete btMonCountersMap[key];
    }catch(err){util.logger.warn(err);}
};

btManager.clear = function(){
    btNameMap = new Object();
    btMonCountersMap = new Object();
    btManager.btIdvsNameMap={};
};
/* Clearing btThresholdMap */
btManager.clearthresholdmap = function(){
    btThresholdMap={}
}
/*Getting All BT's, that is to be dump*/
btManager.getBtList = function(){
    return btNameMap;
}

module.exports = btManager;

