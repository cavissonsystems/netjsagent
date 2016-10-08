/**
 * Created by Siddhant on 13-09-2016.
 */

var fs = require('fs');
var BTMap = new Object();
var Regex = require("regex");
var util = require('../util');
var path = require('path');
var Url  = require('url');
var requestMap = new Object();
var btId = 0;
var agentSetting = require('../agent-setting');
var samples = require('../nodetime/lib/samples.js');

function ndBTMetaData (){

}

ndBTMetaData.getLength = function(){
    return Object.keys(BTMap).length;
};

/*ndBTMetaData.getData = function (filename) {

    //if file name btRuleFile is not present then, default bt file will be sent.
    if (!fs.existsSync(filename))
    {
        filename = path.resolve(__dirname) + '/bt';
    }

    var data = fs.readFileSync(filename).toString().split("\n");

   /* 7|NsecomHome|9|0|/nsecom/home|0       current design

    Pattern ID |Display name|BT ID|Match Type|URL | Include/Exclude

    7|Index|1|0|1|/nsecomm*/


    try {
        for(var i = 0; i<data.length; i++) {

            var BTConf = new Object();
            var dataValue = data[i].split("|");

            var urlPattern = dataValue[4];
            BTConf.BTName = dataValue[1];
            BTConf.BTID = dataValue[2];
            BTConf.BTMatchMode = dataValue[3];
            BTConf.BTIncluMode = dataValue[5];

            BTMap[urlPattern] = BTConf;


        }

    }catch (err){
        util.logger.warn(agentSetting.currentTestRun + " | Error is "+err);
    }
}*/

String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.indexOf(searchString, position) === position;
};

/*ndBTMetaData.matchData = function(url)
{
    try {

        var retBTConf = new Object();
        var keys = Object.keys(BTMap);
        for (var i = 0; i < keys.length; i++) {
            var BTMapKey = keys[i];
            var BTmapValue = BTMap[keys[i]];

            if (BTmapValue.BTMatchMode == 1) {
                if (url.startsWith(BTMapKey)) {
                    retBTConf.BTID = BTmapValue.BTID;
                    retBTConf.BTName = BTmapValue.BTName;
                    retBTConf.BTIncluMode = BTmapValue.BTIncluMode;
                    return retBTConf;
                }
            } else if (BTmapValue.BTMatchMode == 0) {

                var regex = new Regex(BTMapKey);
                if (regex.test(url)) {
                    retBTConf.BTID = BTmapValue.BTID;
                    retBTConf.BTName = BTmapValue.BTName;
                    retBTConf.BTIncluMode = BTmapValue.BTIncluMode;
                    return retBTConf;
                }
            }
        }
        return null;
    }
    catch(err)
    {
        util.logger.warn(agentSetting.currentTestRun + " | Error is "+err);
    }

};*/

ndBTMetaData.getValue = function(key){              //map[(url),(BTObject)]
    return BTMap[key];
};

/*ndBTMetaData.getKey = function(value){      //for getting BTName based on Id
    var key;
    var keys = Object.keys(BTMap);
    for( var i = 0; i< keys.length; i++) {
        if(BTMap[keys[i]].BTID == value){
            key = keys[i];
        }
    };
    return key;
};

ndBTMetaData.set = function(url,req) {

    var btName;
    if (requestMap[url] == undefined)
    {
        try {
            if(!fs.existsSync(path.join(path.resolve(__dirname),'/../../../../ndBtRuleFile.txt')))
                {
                    btId = btId + 1;
                    samples.add('7,' + btId + "," + url + "\n");

                    var URL=req['originalUrl'];

                    if(URL === undefined ){
                        URL=req['url'];
                    }
                    URL = Url.parse(URL) ;

                    requestMap[url] = {btId :btId,btName:URL};
                    req.cavBtObj = {btId :btId,btName:URL};
                }
                else {
                    var bt = ndBTMetaData.matchData(url);

                    if (bt != null) {
                        btId = bt.BTID;
                        btName = bt.BTName;
                    }

                    if (btId == undefined)
                    {
                        btId = 0;
                        btName = "Others";
                        samples.add('7,' + btId + "," + btName + "\n");
                    }
                    else
                    {
                        if(bt.BTIncluMode == 0) {       //if includeMode is 0, dump bt meta record
                            samples.add('7,' + btId + "," + btName + "\n");
                        }
                        else
                        {
                            return false;
                        }
                    }
                    requestMap[url] = {btId :btId,btName:btName};
                    req.cavBtObj = {btId :btId,btName:btName};
                }
        } catch (err) {
            util.logger.warn(err);
        }
    }
    else {
        btId = requestMap[url].btId;
        req.cavBtObj = requestMap[url];
    }
    return btId;
};*/

ndBTMetaData.clear = function(){
    requestMap = new Object();
    btId = 0;
};
/*
ndBTMetaData.completeData = function(){
    var keys = Object.keys(requestMap);
    var data ;
    for(var i in keys)
    {
        data
    }
    return data
};*/



/*ndBTMetaData.getAll = function(){
    var data = [];
    var record = "na";
    var keys = Object.keys(BTMap);
    for (var i = 0; i < keys.length; i++) {
        var val = ndBTMetaData.getKey(i);
        record = '7'  + "," + i + "," + val + '\n';
        data.push(val);
    }
    return data;

};*/

module.exports = ndBTMetaData;