/**
 * Created by Sahil on 04-09-2015.
 */

var fs = require('fs');
var BTMap = new Object();
var Regex = require("regex");
var util = require('../util');
var path = require('path');
function BTConfiguration()
{

}


BTConfiguration.getData = function (filename) {

    //if file name btRuleFile is not present then, default bt file will be sent.

    if (!fs.existsSync(filename))
    {
        filename = path.resolve(__dirname) + '/bt';
        util.logger.info(0+" | BtCategory file is not present . ");
    }

    util.logger.info(0+" | Reading btCategory file : " + filename);

    var data = fs.readFileSync(filename).toString().split("\n");


    try {
        for(var i = 0; i<data.length; i++) {

            var BTConf = new Object();
            var dataValue = data[i].split("|");

            var urlPattern = dataValue[5];
            BTConf.BTName = dataValue[1];
            BTConf.BTID = dataValue[2];
            BTConf.BTMatchMode = dataValue[3];
            BTConf.BTIncluMode = dataValue[4];

            BTMap[urlPattern] = BTConf;

        }
    }catch (err){
        util.logger.warn("Error is "+err);
    }
}

String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.indexOf(searchString, position) === position;
};

BTConfiguration.matchData = function(url)
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
                    return retBTConf;
                }
            } else if (BTmapValue.BTMatchMode == 0) {

                var regex = new Regex(BTMapKey);
                if (regex.test(url)) {
                    retBTConf.BTID = BTmapValue.BTID;
                    retBTConf.BTName = BTmapValue.BTName;
                    return retBTConf;
                }
            }
        }
        return null;
    }
    catch(err)
    {
        util.logger.warn("Error is: " + err)
    }

}

module.exports = BTConfiguration;