var PropertiesReader = require('properties-reader');
var path = require('path')
var file = path.resolve(path.join(__dirname,'/../../../../ndsettings.conf')),
    compareVersion = require('./compare-verssions'),
    properties,clsMode;
try{
    properties = PropertiesReader(file)
}catch(e){
    console.log('Error in loading the ndsettings.conf file :',e)
}

if(properties)
    clsMode = properties.get('clsMode');

var nodeVersion =  process && process.version;
try{
    var version = nodeVersion && compareVersion(nodeVersion,'v8.0.0')
    if(clsMode == 1 && version >=0){
        module.exports = require('cls-hooked')
    else
        module.exports = require('./cavisson-continuation-local-storage')
}catch (e){
    console.log('Cannot find module cls',e)
}