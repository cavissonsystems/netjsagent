/*
* Created by sahil on 30/5/2017.
* This file will check version of nodeJs , and on basis of this version, falafel version will be decided
* */
try{
var npm = require('npm');
var util = require('./lib/utils/compare-verssions.js')
var nodeVersion = process.version
var version = util(nodeVersion,'v4.0.0')
npm.load(function(err) {

  // install module ffi
if(version == 1 || version == 0)
  npm.commands.install(['falafel@2.1.0'], function(er, data) {if(er)console.log("Fail to install falafel@2.1.0")});
else if( version == -1)
  npm.commands.install(['falafel@0.3.1'], function(er, data) {if(er)console.log("Fail to install falafel@0.3.1")});

  npm.on('log', function(message) {
    // log installation progress
  });
});
}catch(err){console.log("Cant find module npm ")}
