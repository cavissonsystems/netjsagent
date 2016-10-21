/**
 * Created by Siddhant on 26-09-2016.
 */
var threshold = require('./threshold');
var btObj = require('./btObj');
//var btConfig = require('./btConfig');
var samples = require('../nodetime/lib/samples');
var btDetails = require('./BTDetails');
var util = require('../util');

var btNameMap = new Object();
var btRecordMap = new Object();

function btManager (){

};

btManager.getBtObj = function(key){              //map[(BTName),(BTObject)]
    return btNameMap[key];
};

btManager.getBtID = function(name){      //for getting BTName based on Id
    return btNameMap[name].btId;
};

btManager.insertBT= function (id, name, threshold){
    var bt= new btObj(id, name, threshold);
    btNameMap[name]=bt;

    if(id != null)
    samples.add('7,' + id + "," + name + "\n");
};

btManager.insertID = function(name, id){
    btNameMap[name].btId = id;
    samples.add('7,' + id + "," + name + "\n");     //todo check include Mode
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

btManager.createAndUpdateBTRecord = function (btId, btName, respTime, cat, statusCode) {
    try {

        if (btRecordMap[btId] == undefined) {

            btManager.createBTRecord(btId, btName, respTime, cat, statusCode);
        } else {
            btManager.updateBTRecord(btId, btName, respTime, cat, statusCode);
        }
    }catch(err){
         util.logger.warn(err);
    }
}

btManager.createBTRecord = function(newID,newName,respTime,cat,statusCode){

    try {
        var btd = new btDetails();
        btd.createBTRecord(newID, newName, respTime, cat, statusCode);
        btRecordMap[newID] = btd;
    }catch(err){
        util.logger.warn(err);
    }
}

btManager.updateBTRecord = function (btId, btName, respTime, cat, statusCode) {
    var btdetails = btRecordMap[btId];
    btdetails.updateBTDetail(respTime, cat, statusCode);
}

btManager.getBTKey = function() {
    return Object.keys(btRecordMap);
};

btManager.getBTData = function(key){
    return btRecordMap[key];
}

btManager.deleteBTRecord = function(key){
    try {
        delete btRecordMap[key];
    }catch(err){util.logger.warn(err);}
};

btManager.clear = function(){
    btNameMap = new Object();
    btRecordMap = new Object();
};


module.exports = btManager;

