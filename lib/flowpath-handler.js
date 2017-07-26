/**
 * Created by Sahil on 06-08-2015.
 */

var agentSetting = require("./agent-setting");
var threadID = 10;
var threadSeq = 10.1;
var util =  require('./util');
var fs = require('fs');
var path = require('path');
var flowPathId = "" ;
var fpid ="";
var counter = 0 ;
var flowpath = require('./flowpath/flowpath').Flowpath;
var cookieParsing = require('./HttpHeader/Cookies');
//var cookieParsing = require('cookies');
var StringBuffer = require('./flowpath/StringBuffer').StringBuffer;
var cavNdSessionDataModel = require('./HttpHeader/cavNdSessionDataModel');
var big_integer = require('./utils/BigInteger');
var btConfig = require('./BT/btConfig');
var btManager = require('./BT/btManager');

/******* Start for CavNV constants ********************/
const NDNV_SESSION_ID_INDEX = 0,
    NDNV_TEST_RUN_INDEX = 1,
    NDNV_PREV_START_TIME_INDEX = 2,
    NDNV_IS_INSTRUMENTED_SESSION_INDEX = 3,
    NDNV_CATEGORY_INDEX = 4,
    NDNV_EXCEPTION_COUNT_INDEX = 5,
    NDNV_FP_COUNT_IN_SESSION_INDEX = 6;

function flowpathhandler() {}

function handleIncludedAndExcludedCase (context){
    var curRandomNumber = 1 + parseInt(Math.random() * 100);
    if (curRandomNumber <= agentSetting.bciInstrSessionPct) {
        context.cavIncludeFp = true;
    } else {
        context.cavIncludeFp = false;
    }
}

function setCookieInResp(cookie,req,res,cavNVCookie,isInstrumentedSession){
    cookie
        .set(agentSetting.enableNDSession.fPIHeaderName , cavNVCookie);
    cookie
        .set('path','/')
    if(agentSetting.enableNDSession.cookieDomainName) {
        cookie
            .set('domain',agentSetting.enableNDSession.cookieDomainName)
    }
    if(agentSetting.enableNDSession.setHeaderInResponse){
        var xHeaderValue = fpid +'_'+ agentSetting.currentTestRun +'_'+ 'unknown' +'_'+ isInstrumentedSession ;
        res.setHeader(agentSetting.enableNDSession.xHeaderName,xHeaderValue)
    }
}

function checkFlowpathToIncludeOrExclude(cavNVCookie,context,isInstrumentedSession,isSessionExpired){
    if ('100' == agentSetting.bciInstrSessionPct) {
        context.cavIncludeFp = true;
    } else if ((0 < agentSetting.bciInstrSessionPct) && (100 > agentSetting.bciInstrSessionPct)){
        if(isInstrumentedSession){
            if(!isSessionExpired)
                context.cavIncludeFp = true;
            else
                handleIncludedAndExcludedCase(context)          //Session is expired, check to include or exclude fp
        }else{
            if(!cavNVCookie)
                handleIncludedAndExcludedCase(context)      //1. either session instrumented information is not recieved from cavnv cookie because cookie is null
            else
                context.cavIncludeFp = false;       //2. cookie is recieved and session is marked as not instrumented. exclude these flowpaths
        }
    }
    else{
        context.cavIncludeFp = false;
    }
}

flowpathhandler.clearCounter =function(){counter=0;};

flowpathhandler.ceateFpId = function()
{
    try {
        var currTimeStamp = new Date().getTime() - (agentSetting.cavEpochDiffInMills);

        var current = counter;
        if (current == counter) {
            counter = counter + 1;
        }
        // Creating FlowPath_ID
        // ((flowPathInstanceInitialID + ((currTimeStamp & timeStampMask) << seqNoDigits ) + ((p.data) & seqNumMask)) + '');

        var mask_counter = (big_integer(big_integer(big_integer(currTimeStamp).and(agentSetting.timeStampMask)).shiftLeft(agentSetting.seqNoDigits)).add(big_integer(counter).and(agentSetting.seqNumMask.toString()))).toString()
        fpid = (big_integer(agentSetting.flowPathInstanceInitialID.toString()).add(mask_counter)).toString();

    }catch(err){util.logger.warn(err)}
}

flowpathhandler.handleFlowPath = function(req,res,context) {
    if(!agentSetting.isToInstrument)return;
    //var header = req.headers['accept'];
    if (req.hasOwnProperty('url') /*&& (header.indexOf('text/html') > -1 || header.indexOf("*!/!*")  > -1)*/ ) {
        var url = req['url'];
        var ext = req['url'].split(".").pop();          //it will give the last value after splitting <Extension of url file>

        if(ext == 'css' || ext == 'png' || ext == 'js' ||ext == 'jpeg' ||ext == 'ico'||ext == 'svg') {
            return;
        }
        /*if(url.indexOf('.css') != -1 || url.indexOf('.png') != -1 || url.indexOf('.js') != -1 ||url.indexOf('.jpeg') != -1 ||url.indexOf('.ico') != -1 ||url.indexOf('.svg') != -1)
         return ;*/
        var Flowpath = new flowpath();
        var nsFlowpathInstanceID = req.headers['cavndfpinstance'];          //Getting FPID from request i.e parent generated FPID.

        var correlationIDHeader = req.headers && (req.headers[agentSetting.correlationIDHeader.toLowerCase()] ||
            req.headers[agentSetting.correlationIDHeader]);

        flowpathhandler.ceateFpId();                            //Creating FPID
        context.cavTimeInMillis = Flowpath.timeInMillis = (new Date().getTime()) - agentSetting.cavEpochDiffInMills;
	    if(correlationIDHeader) {
            var sb = new StringBuffer();
            sb.clear();
            Flowpath.correlationIDHeader = agentSetting.encodeURI(sb,correlationIDHeader).toString()
            sb.clear();
        }

        var NVSid = null,cookies = null,NVPid = null,cavNVCookie = null,nvCokkie= null,ndSessionId =0,
            prevFPStartTime = Number.max_value,isInstrumentedSession = false,
            idleTime,totalFPCountInSession = 0,isSessionExpired= false;
        var cookie = new cookieParsing(req,res)
        if(agentSetting.enableNDSession.enableFPHdrInRep) {
            cavNVCookie = cookie.get(agentSetting.enableNDSession.fPIHeaderName)
            NVSid = cookie.get(agentSetting.enableNDSession.NVSid)
            NVPid = cookie.get(agentSetting.enableNDSession.NVPid)
            nvCokkie = cookie.get(agentSetting.enableNDSession.NVCookie)
        }
        if(!cavNVCookie) {
            ndSessionId = fpid;
            totalFPCountInSession = 0;
            cavNdSessionDataModel.NDSessionFPCount = totalFPCountInSession + 1;
        }
        else{
            if(cavNVCookie.indexOf(",") !== -1) {
                //if(bciTraceLevel > 1)
                //    NDListener.logBCIError(Server.TestRunIDValue, "NDSys", "handleNewFlowpathNonNs", "Invalid format for cavNVCookie - " + cavNVCookie);
                ndSessionId  = fpid;
                cavNdSessionDataModel.NDSessionFPCount = totalFPCountInSession + 1;
            }
            else {
                var tmpStr = cavNVCookie.split("-");
                ndSessionId = tmpStr[NDNV_SESSION_ID_INDEX].trim();
                //if session id is received as blank then create new session id. need to handle blank cases for static page without flowpaths
                ndSessionId = ("" === (ndSessionId.trim()) ? fpid : ndSessionId);
                prevFPStartTime = parseInt(tmpStr[NDNV_PREV_START_TIME_INDEX].trim());
                isInstrumentedSession = "1" === (tmpStr[NDNV_IS_INSTRUMENTED_SESSION_INDEX].trim());

                idleTime = (new Date().getTime() - agentSetting.cavEpochDiffInMills) - prevFPStartTime;
                totalFPCountInSession = parseInt(tmpStr[NDNV_FP_COUNT_IN_SESSION_INDEX].trim());
                if(idleTime > agentSetting.enableNDSession.ndSessionIdleTimeOutSecs && agentSetting.enableNDSession.ndSessionIdleTimeOutSecs != 0 ||
                    (totalFPCountInSession >= agentSetting.enableNDSession.maxFPCountInSession && 0 != agentSetting.enableNDSession.maxFPCountInSession)) {
                    ndSessionId = fpid;
                    isSessionExpired = true;
                    totalFPCountInSession = 0;
                    cavNVCookie = null;
                }
                cavNdSessionDataModel.NDSessionFPCount = totalFPCountInSession + 1;
            }
        }
        checkFlowpathToIncludeOrExclude(cavNVCookie,context,isInstrumentedSession,isSessionExpired)
        isInstrumentedSession = context.cavIncludeFp
        Flowpath.ndSessionId = ndSessionId
        Flowpath.cavNVCookie = cavNVCookie = cavNdSessionDataModel.encode(ndSessionId,Flowpath.timeInMillis,isInstrumentedSession,agentSetting.currentTestRun)
        if(agentSetting.enableNDSession.methodEntryDepth2SetCookie)
            setCookieInResp(cookie,req,res,cavNVCookie,isInstrumentedSession)

        var btObj = btConfig.executeBTRule(req);                            //Generating BTObj for every Req i.e {btid : 1, btName: Index ,threshold :{slow:3000, vSlow : 5000}}
        if(!btObj)
            return;

        if(!context)return ;
        context.cavBtObj = btObj;

        var bt_Data = btManager.getBTData(btObj.btId); //Lookup in BtMonitorMap if it is undefined , then creating it i.e {btId : btDetails}

        /*
        * 1. Checking current request is to be include or exclude , If a Bt reached to its threshold (bciInstrPct) ,
        * then on basis of dumping percentage we changed btValue from include to exclude or exclude to include .
        * 2. If some BT is becoming slow or very slow , then we changed its value from exclude to include , and this check
        * is in continuation local storage .
        * 3. We check dumping percentage on basis of total coming request to total dumped request .
        * */
        if(!cavNVCookie) {
            if (!bt_Data) {
                //These cahnges done regarding dynamic slow/vslow threshold for particular BT
                btManager.createAndUpdateBTRecord(btObj.btId, btObj.btName, undefined, "", "", btObj.threshold.dynamicSlowThresoldPct, btObj.threshold.dynamicVSlowThresoldPct);//If BT object is not created and create it at once
                bt_Data = btManager.getBTData(btObj.btId);
                bt_Data.updateTotalAndAvgDumpReq();//This function used for calculate total dump requests

                if (bt_Data.isDumpPctLessThanBCIPct(agentSetting.bciInstrSessionPct)) {
                    context.cavIncludeFp = true;
                    bt_Data.updateTotDumpReq();
                }
                else
                    context.cavIncludeFp = false;
            }
            else {
                bt_Data.updateTotalAndAvgDumpReq();
                if (bt_Data.isDumpPctLessThanBCIPct(agentSetting.bciInstrSessionPct)) {
                    context.cavIncludeFp = true;
                    bt_Data.updateTotDumpReq();
                }
                else
                    context.cavIncludeFp = false;
            }
        }

        if(agentSetting.enableBciDebug>4)
            util.logger.info(agentSetting.currentTestRun ,"| Dumping Request header for " , url , ",FPID :",fpid ,':', req.headers)

        /*
        * Checking for NS genertated FPID
        * */
        if(nsFlowpathInstanceID != null)
        {
            if(nsFlowpathInstanceID.indexOf("_") == -1) {
                Flowpath.tlFirstTierFPID = flowPathId = nsFlowpathInstanceID;
                if (Flowpath.seqPfx == undefined)
                    Flowpath.seqPfx = Math.floor(Math.random()*(999-1+1)+1);
            }
            else {
                var fp_values = nsFlowpathInstanceID.split("_");
                // there are 2 cases:
                // 1. if isNewTierCallOutFormat
                //    1.1  if tlFirstTierFPID is null : 4893734774158527269_100.10.51
                //    1.2  if tlFirstTierFPID not null: 4893734774157037605_4893734774158527269_100.10.51
                // 2. if not isNewTierCallOutFormat: 4893734774158527269_100.10.51

                var seqPfx = "";
                var tlFirstTierFPID = "";
                if(fp_values.length > 2) {
                    seqPfx = fp_values[2];
                    tlFirstTierFPID = fp_values[0];
                }
                else {
                    seqPfx = fp_values[1];
                    tlFirstTierFPID = fp_values[0];
                }
                if(fp_values.length > 2)
                    flowPathId = fpid + ":" + fp_values[0] + ":" + fp_values[1] ;        // format: <currentFPID>:<firstTierFPID>:<parentTierFPID>
                else
                    flowPathId = fpid + ":" + fp_values[0]  ;        // format: <currentFPID>:<parentTierFPID>

                if (Flowpath.seqPfx == undefined && Flowpath.tlFirstTierFPID == undefined ) {
                    if(seqPfx)
                        Flowpath.seqPfx = seqPfx;
                    else
                        Flowpath.seqPfx = Math.floor(Math.random()*(9007199254-1+1)+1);

                    Flowpath.tlFirstTierFPID = tlFirstTierFPID;
                }
            }
        }
        else{
            Flowpath.tlFirstTierFPID = flowPathId = fpid.toString() ;
            if(Flowpath.seqPfx == undefined) {
                Flowpath.seqPfx = Math.floor(Math.random() * (19999 - 1 + 1) + 1);                //Generating random no. (In BCI generating ThreadID)
            }
        }
        var localFlowPathId = flowPathId.toString();
        /*
        * Setting Current FPID, flowpathIdForHotSpot, FP_start_time (timeInMillis), in current Request.
        * */

        context.cavFlowPathId= Flowpath.flowPathId = localFlowPathId;
        context.cavHsFlowPathId=localFlowPathId;
        context.fpTimeWithoutCavepoch = Flowpath.fpTimeWithoutCavepoch = Flowpath.timeInMillis + agentSetting.cavEpochDiffInMills;
        Flowpath.timeStamp =  parseInt(Flowpath.timeInMillis / 1000);

        agentSetting.flowMap[localFlowPathId] = Flowpath ;
        threadID = process.pid;

        if(agentSetting.flowMap[localFlowPathId].seqPfx != undefined)
            Flowpath.threadSeq = agentSetting.flowMap[localFlowPathId].seqPfx + ".1";
        else
            Flowpath.threadSeq = threadID + ".1";
	
	var sb = new StringBuffer();
    	sb.clear();
        Flowpath.threadID = threadID ;
        Flowpath.id = btObj.btId ;
	var encodedUri = agentSetting.encodeURI(sb,url).toString()
        Flowpath.url = encodedUri ;
    }
}

module.exports = flowpathhandler;
