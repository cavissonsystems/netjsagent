/*
* Created By sandeep Ohdar on 19 September.
*
*
* */

var {execSync} = require('child_process');
var fs = require('fs');
var util = require('./util')
var agentSetting = require('./agent-setting')

function captureProcessCoreDump(){}

captureProcessCoreDump.parseCommand = function(commPath,fileName,clientSocket){

    try{
        if(!fileName)
            fileName = 'coreDump_'+agentSetting.getTierName()+'_'+agentSetting.getServerName()+'_'+agentSetting.getInstance()+'_'+new Date().getTime()
        if(!commPath)
            commPath = '/tmp'
        validateCommPath(commPath,function (err){
            if(!err){
                executeCoreDump(commPath,fileName,clientSocket)
            }else if(typeof (err) == 'string'){
                util.logger.error(agentSetting.currentTestRun , ' | Error : ',err)
                clientSocket.write('nd_control_rep:action=captureProcessCoreDump;result=Error:'+err+';\n')
            }
        })
    }catch(e){
        clientSocket.write('nd_control_rep:action=captureProcessCoreDump;result=Error:Error in Parsing Command;\n')
        util.logger.error(agentSetting.currentTestRun , ' | Error in ParseCommand : ',e)
    }
}

function executeCoreDump(commPath,fileName,clientSocket){

    try{
        //create the child process context
        var output = execSync('sudo -l gcore',{cwd:commPath})

        util.logger.info(agentSetting.currentTestRun ,' | Command {sudo -l gcore} Execution Output : ',output.toString())

        if(output.toString().indexOf('gcore') > -1 ){
            var command = 'sudo gcore -o '+fileName+' '+process.pid
            if(agentSetting.enableBciDebug > 2)
                util.logger.info(agentSetting.currentTestRun ,' | Command Available ,Going to Run command : ',command)

            var result = execSync(command,{cwd:commPath}).toString();

            util.logger.info(agentSetting.currentTestRun + ' | Output of Caturing Core Dump :',result.toString())
            if(result.indexOf('Saved') > -1){
                clientSocket.write('nd_control_rep:action=captureProcessCoreDump;result=Success:core Dump file Created;\n')
                util.logger.info(agentSetting.currentTestRun , 'Core File Saved on path : '+commPath,' ,Named :',fileName+'.'+process.pid)
            }
        }else{
            clientSocket.write('nd_control_rep:action=captureProcessCoreDump;result=Error:Execution Command is failed;\n')
            util.logger.error(agentSetting.currentTestRun + ' | Execution Command is failed.')
        }
    }catch (err){

        /*
       * Child_process throws Exception for systems level Errors
       *
       *     err.stdout;
       *     err.stderr;
       *     err.pid;
       *     err.signal;
       *     err.status;
       *     ..etc
       *
       * */

        if(agentSetting.enableBciDebug > 2){
            util.logger.error(agentSetting.currentTestRun + ' | err.stdout :',err.stdout.toString())
            util.logger.error(agentSetting.currentTestRun + ' | err.stderr :',err.stderr.toString())
            util.logger.error(agentSetting.currentTestRun + ' | err.signal :',err.signal)
            util.logger.error(agentSetting.currentTestRun + ' | err.status :',err.status)
        }

        clientSocket.write('nd_control_rep:action=captureProcessCoreDump;result=Error:Execution Command is failed;\n')
        util.logger.error(agentSetting.currentTestRun + ' | Execution Command is failed Due to Permission Issue /',err.stderr.toString())

    }
}

function validateCommPath(commPath,callback){

    try{
        if(!commPath)
            callback('Command path Invalid');
        else{
            if(fs.existsSync(commPath)){
                try{
                    fs.accessSync(commPath, fs.constants.X_OK| fs.constants.W_OK | fs.constants.R_OK)
                    callback(false);
                }catch(e){
                    util.logger.error(agentSetting.currentTestRun + ' | EACCES: permission denied, access :',e)
                    callback('Path does not have a Sufficient Permissons.')
                }
            }else{
                callback('Command Path Does not Exist.')
            }
        }
    }catch(e){
        util.logger.error(agentSetting.currentTestRun + ' | Error in validateCommandPath :',e)
        callback('Error in validateCommandPath')
    }
}

module.exports = captureProcessCoreDump;
