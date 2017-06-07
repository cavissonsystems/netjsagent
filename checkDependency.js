/*
* Created by sahil on 30/5/2017.
* This file will check version of nodeJs , and on basis of this version, falafel version will be decided
* */
try{
  var npm;
  var util = require('./lib/utils/compare-verssions.js')
  var nodeVersion = process.version
  var version = util(nodeVersion,'v4.0.0');

  if( version == -1){
    npm = require('npm');
    npm.load(function(err) {
      // install module falafel
      npm.commands.install(['falafel@0.3.1'], function(er, data) {if(er)console.log("Fail to install falafel@0.3.1")});
      npm.on('log', function(message) {});
    });
  }
  else
    return;

}catch(err){console.log("Cant find module npm ")}
