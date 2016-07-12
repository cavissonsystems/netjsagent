/**
 * Created by compass241 on 06-08-2015.
 */

var requestMap = new Object();
var methodMap = new Object();
var data;
var randomId = 0;
var agentSetting = require("./agent-setting");
var BigNumber = require('big-integer');
var clientConn = require("./client");
var threadID = 10;
var threadSeq = 10.1;
var BTConfiguration = require('./BT/btconfiguration');
var util =  require('./util');
var fs = require('fs');
var path = require('path');
var Long = require('long');
var flowPathId = "" ;
var fpid ="";
var old = 0 ;

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
    var date = new Date();
    var current_time = date.getTime();

    var currTimeStamp = current_time - (agentSetting.cavEpochDiff);

    var current = old;
    if(current == old)
    {
        old = old+1;
    }

    // Creating FlowPath_ID
    // ((flowPathInstanceInitialID + ((currTimeStamp & timeStampMask) << seqNoDigits ) + ((p.data) & seqNumMask)) + '');

   /* var curr_timeStampMask = bignum(agentSetting.timeStampMask).and(currTimeStamp).shiftLeft(agentSetting.seqNoDigits);
    var counter_seqNumMask = bignum(agentSetting.seqNumMask).and(old);

    fpid = bignum(agentSetting.flowPathInstanceInitialID).add(curr_timeStampMask).add(counter_seqNumMask);*/
    var timeStampMask = new Long(agentSetting.timeStampMask);
    currTimeStamp = new Long(currTimeStamp);
    var seqNoDigits = new Long(agentSetting.seqNoDigits);
    var seqNumMask = new Long(agentSetting.seqNumMask);

    var  curr_timeStampMask = new Long(timeStampMask).and(currTimeStamp).shiftLeft(seqNoDigits).toString();
    var counter_seqNumMask = new Long(seqNumMask).and(old).toString();

    fpid = new Long.fromString(agentSetting.flowPathInstanceInitialID).add(curr_timeStampMask).add(counter_seqNumMask);
}



flowpathhandler.handleFlowPath = function(req,res,args) {

    agentSetting.isRequested = true;
    var date = new Date();
    var current_time = date.getTime();
    var sec_time = parseInt(current_time / 1000);


    var header = req.headers['accept'];

    flowpathhandler.ceateFpId();

    if (req.hasOwnProperty('url') /*&& (header.indexOf('text/html') > -1 || header.indexOf("*!/!*")  > -1)*/ ) {
        var id;

        var btName
        var newID;
        var newName;
        var timeStamp;
        var url = req['url'];

        var nsFlowpathInstanceID = req.headers['cavndfpinstance'];

        if (requestMap[url] == undefined)
        {
            try {
                if (agentSetting.isToInstrument && agentSetting.dataConnHandler) {

                    if(!fs.existsSync(path.join(path.resolve(__dirname),'/../../../ndBtRuleFile.txt')))
                    {
                        id = ++randomId;

                        util.logger.info("Dumping 7 record for BT " + '7,' + id + "," + url + "\n");
                        agentSetting.dataConnHandler.client.write('7,' + id + "," + url + "\n");

                        requestMap[url] = id ;
                    }
                    else {
                        var bt = BTConfiguration.matchData(url);

                        if (bt != null) {
                            id = bt.BTID;
                            btName = bt.BTName;
                        }

                        if (id == undefined)
                        {
                            id = 0;

                            util.logger.info("Dumping 7 record for Other BT " + '7,' + id + "," + "Others" + "\n");
                            agentSetting.dataConnHandler.client.write('7,' + id + "," + "Others" + "\n");
                        }
                        else
                        {
                            util.logger.info("Dumping 7 record for BT " + '7,' + id + "," + btName + "\n");
                            agentSetting.dataConnHandler.client.write('7,' + id + "," + btName + "\n");
                        }

                        requestMap[url] = id;
                    }
                }
            } catch (err) {
                util.logger.warn("Error is "+err);
            }
        }
        else {
            id = requestMap[url];
        }

        if(nsFlowpathInstanceID != null)
        {
            if(nsFlowpathInstanceID.indexOf("_") == -1) {
                flowPathId = nsFlowpathInstanceID;
                var fp_id = agentSetting.flowMap[flowPathId];
                fp_id = new Object();
                if (fp_id.seqPfx == undefined)
                {
                    fp_id.seqPfx = Math.floor(Math.random()*(999-1+1)+1);
                    agentSetting.flowMap[flowPathId]=fp_id;
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


                var fp_id = agentSetting.flowMap[flowPathId];
                fp_id = new Object();
                if (fp_id.seqPfx == undefined && fp_id.tlFirstTierFPID == undefined )
                {
                    if(seqPfx)
                        fp_id.seqPfx = seqPfx;
                    else
                        fp_id.seqPfx = Math.floor(Math.random()*(9007199254-1+1)+1);

                    fp_id.tlFirstTierFPID = tlFirstTierFPID;
                    agentSetting.flowMap[flowPathId]=fp_id;
                }
            }
        }
        else
        {
            flowPathId = fpid ;

            var fp_id = agentSetting.flowMap[flowPathId];
            fp_id = new Object();
                if(fp_id.seqPfx == undefined)
                {
                    fp_id.seqPfx = Math.floor(Math.random() * (19999 - 1 + 1) + 1);                //Generating random no. (In BCI generating ThreadID)
                    agentSetting.flowMap[flowPathId] = fp_id;
                }
        }
        var localFlowPathId = flowPathId;

        flowPathId = localFlowPathId.toString();

        timeStamp = sec_time - (agentSetting.cavEpochDiff);
        req['flowPathId']= localFlowPathId.toString();
        req.timeInMillis = current_time - (agentSetting.cavEpochDiff*1000);
        try
        {
            if (agentSetting.isToInstrument && agentSetting.dataConnHandler)
            {
                threadID =  Math.floor(Math.random() * (999 - 1 + 1) + 1);

                if(agentSetting.flowMap[localFlowPathId].seqPfx != undefined)
                {
                    threadSeq = agentSetting.flowMap[localFlowPathId].seqPfx + ".1";
                }else
                {
                    threadSeq = threadID + ".1";
                }

                util.logger.info("Dumping Flowptah " + '2,' + localFlowPathId.toString() + "," + timeStamp + "," + threadID + "," + threadSeq + "," + id + "," + url + "\n");
                agentSetting.dataConnHandler.client.write('2,' + localFlowPathId.toString() + "," + timeStamp + "," + threadID + "," + threadSeq + "," + id + "," + url + "\n");
            }

        }
        catch (err){util.logger.warn("Error is "+err);}
    }
}

module.exports = flowpathhandler;