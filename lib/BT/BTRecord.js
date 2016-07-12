/**
 * Created by Siddhant on 10-09-2015.
 */

var agentSetting = require("../agent-setting");
//var backendId = 1;

var btDeatil = require('./BTDetails');


function BTRecord(){

}


BTRecord.createAndUpdateBTRecord = function (BTID, BTName, RespTime,cat,statusCode) {

    if (agentSetting.btrecordMap[BTID] == undefined) {

        BTRecord.createBTRecord(BTID, BTName, RespTime, cat,statusCode);
    } else {
        BTRecord.updateBTRecord(BTID, BTName, RespTime, cat,statusCode);
    }
}

BTRecord.createBTRecord = function(newID,newName,respTime,cat,statusCode){

    var btd = new btDeatil();
    btd.createBTRecord(newID,newName,respTime,cat,statusCode);
    agentSetting.btrecordMap[newID] = btd;
}

BTRecord.updateBTRecord = function (BTID, BTName, RespTime,cat,statusCode) {
    var btdetails = agentSetting.btrecordMap[BTID];
    btdetails.updateBTDetail(RespTime,cat,statusCode);
}


module.exports = BTRecord;