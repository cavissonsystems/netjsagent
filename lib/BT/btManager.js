/**
 * Created by Siddhant on 26-09-2016.
 */
var threshold = require('./threshold');
var btObj = require('./btObj');
//var btConfig = require('./btConfig');
var samples = require('../nodetime/lib/samples');
var btDetails = require('./BTDetails');
var util = require('../util');

//Map used to store BT details information
//KEY- BT Name  Value- bt thresold object btObj
var btNameMap = new Object();
//Map used to store BT monitoring data per buiseness transaction
// KEY- BT Id Value- BTDetails object
var btMonCountersMap = new Object();

function btManager (){};

btManager.getBtObj = function(key){              //map[(BTName),(BTObject)]
    return btNameMap[key];
};

btManager.getBtID = function(name){      //for getting BTName based on Id
    return btNameMap[name].btId;
};

btManager.insertBT= function (id, name, threshold){
    var bt= new btObj(id, name, threshold);
    btNameMap[name]=bt;

   /* if(id != null)
        samples.add('7,' + id + "," + name + "\n");*/
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

    for (var i in keys){
        //btManager.createAndUpdateBTRecord(keys[i].btId,keys[i].btName,undefined,"","",keys[i].threshold.dynamicSlowThresoldPct,keys[i].threshold.dynamicVSlowThresoldPct);//If BT object is not created and create it at once
        samples.add('7,' + btNameMap[keys[i]].btId + "," + btNameMap[keys[i]].btName + "\n");     //todo check include Mode
        btManager.createAndUpdateBTRecord(btNameMap[keys[i]].btId,btNameMap[keys[i]].btName,undefined,"","","","");//If BT object is not created then create it at once
    }
};

btManager.getKey = function(value){      //for getting BTName based on Id
    var key;
    var keys = Object.keys(btNameMap);
    for( var i = 0; i< keys.length; i++) {
        if(btNameMap[keys[i]].btId == value){
            key = keys[i];
        }
    };
    return key;
};

btManager.getAll = function(){
 var data = [];
 var record = "na";
 for (var i in btNameMap) {
 record = '7'  + "," + btNameMap[i].btId + "," + btNameMap[i].btName + '\n';
 data.push(record);
 }
 return data;

 };


btManager.getLength = function(){
    return Object.keys(btNameMap).length;
};

btManager.createAndUpdateBTRecord = function (btId, btName, respTime, cat, statusCode, slowPct, verySlowPct) {
    try {

        if (btMonCountersMap[btId] == undefined) {

            btManager.createBTRecord(btId, btName, respTime, cat, statusCode, slowPct, verySlowPct);
        } else {
            btManager.updateBTRecord(btId, btName, respTime, cat, statusCode, slowPct, verySlowPct);
        }
    }catch(err){
         util.logger.warn(err);
    }
}

btManager.createBTRecord = function(newID,newName,respTime,cat,statusCode, slowPct, verySlowPct){

    try {
        var btd = new btDetails();
        btd.createBTRecord(newID, newName, respTime, cat, statusCode, slowPct, verySlowPct);
        btMonCountersMap[newID] = btd;
    }catch(err){
        util.logger.warn(err);
    }
}

btManager.updateBTRecord = function (btId, btName, respTime, cat, statusCode, slowPct, verySlowPct) {
    var btdetails = btMonCountersMap[btId];
    btdetails.updateBTDetail(respTime, cat, statusCode);
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
};


module.exports = btManager;

