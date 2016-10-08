/**
 * Created by Siddhant on 26-09-2016.
 */
var threshold = require('./threshold');
var btObj = require('./btObj');
//var btConfig = require('./btConfig');
var samples = require('../nodetime/lib/samples');
var btDetails = require('./BTDetails');

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
 var keys = Object.keys(btNameMap);
 for (var i = 0; i < keys.length; i++) {
 var val = btManager.getKey(i);
 record = '7'  + "," + i + "," + val + '\n';
 data.push(val);
 }
 return data;

 };


btManager.getLength = function(){
    return Object.keys(btNameMap).length;
};

btManager.createAndUpdateBTRecord = function (btId, btName, respTime, cat, statusCode) {
    //console.log("In createAndUpdateBTRecord : " + btId);
    try {

        if (btRecordMap[btId] == undefined) {

            btManager.createBTRecord(btId, btName, respTime, cat, statusCode);
        } else {
            btManager.updateBTRecord(btId, btName, respTime, cat, statusCode);
        }
    }catch(err){
        console.log("error in createAndUpdateBTRecord is : " + err);
    }
}

btManager.createBTRecord = function(newID,newName,respTime,cat,statusCode){

    //console.log("In createBTRecord : " + newID);
    try {
        var btd = new btDetails();
        btd.createBTRecord(newID, newName, respTime, cat, statusCode);
        btRecordMap[newID] = btd;
    }catch(err){
        console.log("error in createBTRecord is : " + err);
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
    delete btRecordMap[key];
};


module.exports = btManager;

