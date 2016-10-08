/**
 * Created by compass241 on 06-08-2015.
 */

//var requestMap = new Object();

var randomId = 0;
var agentSetting = require("./agent-setting");
var clientConn = require("./client");
var threadID = 10;
var threadSeq = 10.1;
//var BTConfiguration = require('./BT/btconfiguration');
var ndBTMetaData = require('./metaData/ndBTMetaData');
var util =  require('./util');
var fs = require('fs');
var path = require('path');
var Long = require('long');
var flowPathId = "" ;
var fpid ="";
var old = 0 ;
var flowpath = require('./flowpath/flowpath').Flowpath;
var samples = require('./nodetime/lib/samples.js');
var bignum = require('bignum');
var btConfig = require('./BT/btConfig');

function flowpathhandler()
{

}

var increment_get = function(data)
{
    var current = data ;
    if  (current == old)
    {
        return current++;
    }
    old = current;
}

flowpathhandler.ceateFpId = function()
{
    try {

        var date = new Date();
        var current_time = date.getTime();

        var currTimeStamp = current_time - (agentSetting.cavEpochDiff * 1000);

        var current = old;
        if (current == old) {
            old = old + 1;
        }

        // Creating FlowPath_ID
        // ((flowPathInstanceInitialID + ((currTimeStamp & timeStampMask) << seqNoDigits ) + ((p.data) & seqNumMask)) + '');

        /* var curr_timeStampMask = bignum(agentSetting.timeStampMask).and(currTimeStamp).shiftLeft(agentSetting.seqNoDigits);
         var counter_seqNumMask = bignum(agentSetting.seqNumMask).and(old);

         fpid = bignum(agentSetting.flowPathInstanceInitialID).add(curr_timeStampMask).add(counter_seqNumMask);*/

        var curr_timeStampMask = bignum(agentSetting.timeStampMask).and(currTimeStamp).shiftLeft(agentSetting.seqNoDigits);
        var counter_seqNumMask = bignum(agentSetting.seqNumMask).and(old);

        fpid = bignum(agentSetting.flowPathInstanceInitialID).add(curr_timeStampMask).add(counter_seqNumMask);

    }catch(err){util.logger.warn(err)}
}

flowpathhandler.handleFlowPath = function(req,res,args) {

    agentSetting.isRequested = true;
    var date = new Date();
    var current_time = date.getTime();
    var sec_time = parseInt(current_time / 1000);
    var Flowpath = new flowpath();

    var header = req.headers['accept'];

    if (req.hasOwnProperty('url') /*&& (header.indexOf('text/html') > -1 || header.indexOf("*!/!*")  > -1)*/ ) {
        
        var url = req['url'];

        if(url.indexOf('.css') != -1 || url.indexOf('.png') != -1 || url.indexOf('.js') != -1 ||url.indexOf('.jpeg') != -1 ||url.indexOf('.ico') != -1 )
            return ;

        flowpathhandler.ceateFpId();

        var nsFlowpathInstanceID = req.headers['cavndfpinstance'];
		
		var btObj = btConfig.executeBTRule(req);
        console.log("btObj is : ");
        console.log(btObj);
        if(btObj == undefined)
        return;

        req.cavBtObj = btObj;
		 
		 /*var btId = ndBTMetaData.set(url,req);
		 if(false == btId)
            return;*/

        if(nsFlowpathInstanceID != null)
        {
            if(nsFlowpathInstanceID.indexOf("_") == -1) {
                flowPathId = nsFlowpathInstanceID;
                if (Flowpath.seqPfx == undefined)
                {
                    Flowpath.seqPfx = Math.floor(Math.random()*(999-1+1)+1);
                }

            }
            else
            {
                var fp_values = nsFlowpathInstanceID.split("_");

                // there are 2 cases:
                // 1. if isNewTierCallOutFormat
                //    1.1  if tlFirstTierFPID is null : 4893734774158527269_100.10.51
                //    1.2  if tlFirstTierFPID not null: 4893734774157037605_4893734774158527269_100.10.51
                // 2. if not isNewTierCallOutFormat: 4893734774158527269_100.10.51

                var seqPfx = "";
                var tlFirstTierFPID = "";
                if(fp_values.length > 2)
                {
                    seqPfx = fp_values[2];
                    tlFirstTierFPID = fp_values[0];
                }
                else
                {
                    seqPfx = fp_values[1];
                    tlFirstTierFPID = fp_values[0];
                }

                if(fp_values.length > 2)
                    flowPathId = fpid + ":" + fp_values[0] + ":" + fp_values[1] ;        // format: <currentFPID>:<firstTierFPID>:<parentTierFPID>
                else
                    flowPathId = fpid + ":" + fp_values[0]  ;        // format: <currentFPID>:<parentTierFPID>




                if (Flowpath.seqPfx == undefined && Flowpath.tlFirstTierFPID == undefined )
                {
                    if(seqPfx)
                        Flowpath.seqPfx = seqPfx;
                    else
                        Flowpath.seqPfx = Math.floor(Math.random()*(9007199254-1+1)+1);

                    Flowpath.tlFirstTierFPID = tlFirstTierFPID;
                }
            }
        }
        else
        {
            flowPathId = fpid.toString() ;
            if(Flowpath.seqPfx == undefined)
            {
                Flowpath.seqPfx = Math.floor(Math.random() * (19999 - 1 + 1) + 1);                //Generating random no. (In BCI generating ThreadID)
            }
        }
        var localFlowPathId = flowPathId.toString();

        timeStamp = sec_time - (agentSetting.cavEpochDiff);
        req['flowPathId']= localFlowPathId;

        req.timeInMillis = current_time - (agentSetting.cavEpochDiff*1000);


        Flowpath.flowPathId = localFlowPathId;
        Flowpath.timeInMillis = current_time - (agentSetting.cavEpochDiff*1000);
        Flowpath.timeStamp = sec_time - (agentSetting.cavEpochDiff);

        agentSetting.flowMap[localFlowPathId] = Flowpath ;

        try
        {
            if (agentSetting.isToInstrument && agentSetting.dataConnHandler)
            {
               threadID =  Math.floor(Math.random() * (999 - 1 + 1) + 1);

                if(agentSetting.flowMap[localFlowPathId].seqPfx != undefined)
                {
                    Flowpath.threadSeq = agentSetting.flowMap[localFlowPathId].seqPfx + ".1";
                }else
                {
                    Flowpath.threadSeq = threadID + ".1";
                }

                Flowpath.threadID = threadID ;
                Flowpath.id = req.cavBtObj.btId ;
                Flowpath.url = url ;
                agentSetting.flowMap[localFlowPathId] = Flowpath ;

                /*var encoded2_record = Flowpath.generate_2_record();

                samples.add(encoded2_record);*/
            }

        }
        catch (err){

            util.logger.warn(err);}
    }
}

module.exports = flowpathhandler;