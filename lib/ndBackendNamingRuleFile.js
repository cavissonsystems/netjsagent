/**
 * Created by Harendra Kumar on 10/6/2016.
 */

function NDBackendNamingRuleFile() {

}
var ndBackendNameFileMap = {};
NDBackendNamingRuleFile.parseBackendNamingRule = function (clintMsg)
{

    setArrayintoHashMap(clientMsg);
}

function setArrayintoHashMap(clientMsg){
    if(clientMsg !== undefined && clientMsg.length > 0)
    {
        for(var i =0; i< clientMsg.length; i++)
        {
            var content = clientMsg[i].split("\|");
            if(content.length > 1)
            {
                ndBackendNameFileMap[content[0]] = content[1];
            }
        }

    }

}

NDBackendNamingRuleFile.isDataPresentInFile = function (backendName) {
    for(var backendName in ndBackendNameFileMap) {
        if(ndBackendNameFileMap.hasOwnProperty(backendName))
            return true;
    }
    return false;
}
module.exports = NDBackendNamingRuleFile;