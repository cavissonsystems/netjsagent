
/**
 * Created by Harendra on 26-03-2017.
 */
var btManager = require('./btManager');
var threshold = require('./threshold');
var util = require('../util');
//var btNameIdMap = btManager.btIdvsNameMap;
var stateMachine;
var stateMachineforHeader;
var wholeList = [];
var STARTWITHMATCH = 18;
var EXACTMATCH = 17;
var SKIPFLAG = 19;
var HTTPMETHOD = 20;
var EXACT_MATCH_MODE = 0;
var STARTS_WITH_MODE = 1;
var BT_PATTERN_BASED_NOT_FOUND_ID = -1;

function patternBasedBT(){}
patternBasedBT.generatePatternBasedBTStateMachine = function (data) {
    try {
        btManager.clear();          //Clearing Old BTMap to set new values.
        var businessTrasactionList = [];
        for (var i = 0; i < data.length; i++) {
            if (data[i].startsWith("7|")) {
                var tempDataArray = data[i].split("|");
                if (tempDataArray.length >= 6) {
                    var patternBasedBTDefinition = patternBasedBT.createAndGetPatternBasedBTDefinition(tempDataArray);
                    if (patternBasedBTDefinition != null)
                        businessTrasactionList.push(patternBasedBTDefinition);
                }
                else {
                }
            }
            else {
                continue;
            }
        }
        wholeList = businessTrasactionList;
        patternBasedBT.createStateMachineTable();
        //patternBasedBT.createStateMachineTableforHeader();
    }
    catch(e){
        util.logger.error(e)
    }
}

patternBasedBT.createAndGetPatternBasedBTDefinition = function (tempDataArray) {
    var patternBasedBTDefinition = {};
    patternBasedBTDefinition.transactionName = tempDataArray[1].trim();

    var excludeMode = 0;
    try {
        excludeMode = parseInt(tempDataArray[5].trim());
    }
    catch (err) {
        excludeMode = 0;
    }
   // btNameIdMap[tempDataArray[2]] = [tempDataArray[1],excludeMode];
    var transactionId = -2;
        try {
            transactionId = parseInt(tempDataArray[2].trim());
        }
        catch (err) {
            return null;
        }

    patternBasedBTDefinition.btId = transactionId;
    var matchType = 0;
    try {
        matchType = parseInt(tempDataArray[3].trim());
    }
    catch (err) {
        matchType = 0;
    }
    try{
        if(tempDataArray[6] == undefined)
            patternBasedBTDefinition.patternMode = 0;
        else
            patternBasedBTDefinition.patternMode = parseInt(tempDataArray[6]) ;
    }
    catch (err) {
        patternBasedBTDefinition.patternMode = 0;
    }
    patternBasedBTDefinition.matchType = matchType;
    patternBasedBTDefinition.pattern  = tempDataArray[4].trim();
    //initialize parameter validation if given in rule. if not provided then  exception is handled and rule will be initialized without parameters
    try {
        if(tempDataArray[6] == "1")
        {
            patternBasedBTDefinition.pattern = patternBasedBTDefinition.pattern + "*" + tempDataArray[7] + "*";
        }
        if(tempDataArray[6] == "2")
        {
            patternBasedBTDefinition.httpMethod = tempDataArray[8];
        }
        if(tempDataArray[6] == "3")
        {
            patternBasedBTDefinition.pattern = patternBasedBTDefinition.pattern + "*" + tempDataArray[7] + "*";
            patternBasedBTDefinition.httpMethod = tempDataArray[8];
        }


    }
    catch(err)
    {
        patternBasedBTDefinition.patternMode = 0;
    }

    try{
        if(  tempDataArray[9] != undefined && tempDataArray[9] != "NA" && tempDataArray[9] != "-" && tempDataArray[9] != ""){
            var tempDataArray1  = tempDataArray[9].split("=");
            patternBasedBTDefinition.btHeaderName = tempDataArray1[0];

            if(tempDataArray1.length == 2)
                patternBasedBTDefinition.btHeaderValue = tempDataArray1[1];
        }
    }
    catch(err){
        patternBasedBTDefinition.btHeaderName = "NA";
        patternBasedBTDefinition.btHeaderValue  = "NA";
    }
    try {
        var btObj,btThresholObj,thresholdObj;
        if(excludeMode == 0) {
            btObj = btManager.getBtObj(patternBasedBTDefinition.transactionName);
            btThresholObj = btManager.getThresholdObj(patternBasedBTDefinition.transactionName);
            if (!btThresholObj)
                btThresholObj = btManager.getThresholdObj('ALL');

            thresholdObj = btThresholObj ? btThresholObj.threshold : threshold.getDefaultThreshold();
            btManager.insertBT(transactionId, patternBasedBTDefinition.transactionName, thresholdObj, excludeMode);
        }
    }
    catch (err){
        util.logger.error(err);
    }
    return patternBasedBTDefinition;

}
patternBasedBT.createStateMachineTable = function () {
    try{

        //var i = 0;
        var nextState = 0;
        var curState = 0;
        var businessTrasactionList;
        try {
            stateMachine = Create2DArray(128); //Creating 2D array of size 128
            businessTrasactionList = wholeList;//patternBasedBTDTO.getPatternBasedBTDefinitionList();
        }
        catch (err){
            util.logger.error(err);
        }
        for (var bto in businessTrasactionList) {
            var pattern = businessTrasactionList[bto].pattern;
            //TODO:Handle skipChars case
            // patternBasedBTDTO.noOfskipChar;
            curState = 0;
            for (var k=0; k<pattern.length; k++) {
                var curVal = 0;
                var currentChar = pattern.charCodeAt(k);
                if (!isCharInPrintableRange(currentChar)) {
                    break;
                }
                if (currentChar == 42) {
                    if (k == (pattern.length - 1))//No more characters left add transaction
                    {
                        // skip flag (*) is not allowed at the end of uri string it will come only if parameter validation is enabled
                        if (businessTrasactionList[bto].patternMode < 2)
                            stateMachine[EXACTMATCH][curState] = businessTrasactionList[bto].btId;
                        //not expected
                        if (businessTrasactionList[bto].matchType == STARTS_WITH_MODE && businessTrasactionList[bto].patternMode < 2)
                            stateMachine[STARTWITHMATCH][curState] = businessTrasactionList[bto].btId;

                        continue;
                    }
                    currentChar = pattern.charCodeAt(++k);
                    stateMachine[SKIPFLAG][curState] = 1;
                }
                if(stateMachine[currentChar][curState])
                    curVal = stateMachine[currentChar][curState];

                if (curVal == 0 || curVal == undefined) {
                    // next state not marked
                    stateMachine[currentChar][curState] = ++nextState; // Need a new state

                    //TODO:Handle this case
                    /*if (nextState >= stateMachine[0].length)
                     // State is more than array size, need to reallocate
                     }*/
                    curState = nextState;
                }
                else {
                    curState = curVal;
                }
                // Check if T already set and give warning (T1 -> T2)
                if (k == (pattern.length - 1)) { // last character
                    try {
                        if (businessTrasactionList[bto].matchType == EXACT_MATCH_MODE) {
                            if (stateMachine[EXACTMATCH][curState] !== undefined) {
                            }
                            if (Number(businessTrasactionList[bto].patternMode) < 2) {
                                stateMachine[EXACTMATCH][curState] = businessTrasactionList[bto].btId;
                            }
                        }
                        else {
                            if (stateMachine[STARTWITHMATCH][curState] !== undefined) {
                            }
                            if (Number(businessTrasactionList[bto].patternMode) < 2) {
                                stateMachine[STARTWITHMATCH][curState] = businessTrasactionList[bto].btId;
                            }
                        }
                    }catch(e){
                    }
                }

            }
            if (Number(businessTrasactionList[bto].patternMode) < 2) {
                continue;
            }
            stateMachine[HTTPMETHOD][curState] = 1;
            var methodByteArray = businessTrasactionList[bto].httpMethod;
            for (var t=0; t< methodByteArray.length; t++){
                var curVal = 0;
                var currentChar =methodByteArray.charCodeAt(t);
                if (!isCharInPrintableRange(currentChar)){
                    break;
                }
                curVal = stateMachine[currentChar][curState];
                if (curVal == undefined){ // next state not marked
                    stateMachine[currentChar][curState] = ++nextState; // Need a new state
                    curState = nextState;
                }
                else{
                    curState = curVal;
                }
                // Check if T already set and give warning (T1 -> T2)
                if (t == (methodByteArray.length - 1)){ // last character
                    if (businessTrasactionList[bto].matchType == EXACT_MATCH_MODE){
                        stateMachine[EXACTMATCH][curState] = businessTrasactionList[bto].btId;
                    }
                    else if(businessTrasactionList[bto].matchType == STARTS_WITH_MODE){
                        stateMachine[STARTWITHMATCH][curState] = businessTrasactionList[bto].btId;
                        //start with is not supported when pattern mode is > 0
                    }
                }
            }
        }
    }
    catch (err){
        util.logger.error(err);
    }

}

patternBasedBT.createStateMachineTableforHeader = function(){
    stateMachineforHeader = Create2DArray(128);
    var businessTrasactionList1 = wholeList;//patternBasedBTDTO.getpatternBasedBTDefinitionList();
    //var i = 0;
    var nextState = 0;
    var curState= 0;
    for ( bto in businessTrasactionList1){
        if("NA" === bto.btHeaderName)
            continue;
        var lastTxID = bto.btId;
        var header = bto.btHeaderValue;
        var headerPattern = lastTxID + header;
        curState = 0;
        for (var i=0; i < headerPattern.length; i++){
            var curVal = 0;
            var currentChar = headerPattern.charCodeAt(i);
            if (!isCharInPrintableRange(currentChar)){
                break;
            }
            curVal = stateMachineforHeader[currentChar][curState];
            if (curVal == undefined){
                // next state not marked
                stateMachineforHeader[currentChar][curState] = ++nextState; // Need a new state
                curState = nextState;
            }
            else{
                curState = curVal;
            }
            // Check if T already set and give warning (T1 -> T2)
            if (i == (headerPattern.length - 1)){
                // last character
                if(bto.matchType == EXACT_MATCH_MODE)
                    stateMachineforHeader[EXACTMATCH][curState] = lastTxID;
                else if(bto.matchType == STARTS_WITH_MODE)
                    stateMachineforHeader[STARTWITHMATCH][curState] = lastTxID;
            }
        }
    }
}
function isCharInPrintableRange(currentChar) {
    if (Number(currentChar) > 31 && Number(currentChar) < 128)
        return true;
    else
        return false;
}
//This function fetch btId from stateMC, args:url
 patternBasedBT.getBTIDFromURL = function(url, method) {
    try {
        var nameAndModeMap = {};
        var nextState = 0;
        var i = 0;//NoOfskipChar
        var lastTxID = -1;
        var value;
        var skipIdx = 0;
        for (var m = 0; m < url.length; m++) {
            var curChar = url.charCodeAt(m);
            if (!isCharInPrintableRange(curChar)) {
                lastTxID = -1;
                break;
            }
            value = stateMachine[curChar][nextState];
            if (value) {
                if (m == (url.length - 1)) {
                    if (stateMachine[HTTPMETHOD][value] != undefined) {
                        return btManager.btIdvsNameMap[checkIfURLOnlyPatternExists(matchMethod(nextState, value, method, lastTxID), value)];
                    }
                    else if (stateMachine[EXACTMATCH][value] != undefined) {
                        return btManager.btIdvsNameMap[stateMachine[EXACTMATCH][value]];
                    }
                    else if (stateMachine[STARTWITHMATCH][value] != undefined) {
                        return btManager.btIdvsNameMap[stateMachine[STARTWITHMATCH][value]];
                    }
                    else {
                        return btManager.btIdvsNameMap[lastTxID];
                    }
                }
                else {
                    if (stateMachine[STARTWITHMATCH][value] != undefined) {
                        lastTxID = stateMachine[STARTWITHMATCH][value];
                    }
                }
                nextState = value;
            }
            else {
                // next State is NULL
                try {
                    if (stateMachine[SKIPFLAG][nextState] || skipIdx != 0) {
                        if (stateMachine[SKIPFLAG][nextState])
                            skipIdx = nextState;
                        nextState = skipIdx;
                        if (m == (url.length - 1)) {

                        } else {
                            continue;
                        }
                    } else if (stateMachine[HTTPMETHOD][nextState] != undefined) {
                        return btManager.btIdvsNameMap[checkIfURLOnlyPatternExists(matchMethod(nextState, nextState, method, lastTxID), nextState)];
                    }
                }catch(er){
                }
                return btManager.btIdvsNameMap[lastTxID];
            }
        } // End of for
        //TODO: return only btId and handle further cases on id basis.
        return btManager.btIdvsNameMap[lastTxID]; //map contain btId as a key and btName as value, because in previous design we need name to process and fetch value from another map.
    }
    catch (err){
        util.logger.error(err);
        return btManager.btIdvsNameMap[lastTxID];
    }
}

function matchMethod(nextState, value, method, lastTxID)
{
    if(null == method || method == "")
        return lastTxID;

    nextState = value;


    for (var k = 0; k < method.length; k++)
    {
        var curChar = method.charCodeAt(k);

        if (!isCharInPrintableRange(curChar))
        {
            lastTxID = BT_PATTERN_BASED_NOT_FOUND_ID;
            break;
        }
        value = stateMachine[curChar][nextState];
        if (value != undefined)
        {
            if (k == (method.length - 1))
            {
                // last character
                if (stateMachine[EXACTMATCH][value] != undefined)
                    return stateMachine[EXACTMATCH][value];
                else if (stateMachine[STARTWITHMATCH][value] != undefined)
                    return stateMachine[STARTWITHMATCH][value];
            }
            else
            {
                //System.out.println("length is not finished");
                //we dont support starts with in http method mode
            }
            nextState = value;
        }
        else
        {
            return lastTxID;
        }
    } // End of for
    return lastTxID;
}


//checks if url pattern is matched with any other rules if parameter or method validation fails
function checkIfURLOnlyPatternExists(lastTxID, value)
{
    try
    {
        if(lastTxID == -1)
        {
            if(stateMachine[EXACTMATCH][value] != undefined)
                lastTxID = stateMachine[EXACTMATCH][value];
            else if(stateMachine[STARTWITHMATCH][value] != undefined)
                lastTxID = stateMachine[STARTWITHMATCH][value];
        }
    }
    catch(err)
    {
        util.logger.error(err);
    }
    return lastTxID;
}
function Create2DArray(rows) {
    var arr = [];
    for (var i=0;i<rows;i++) {
        arr[i] = [];
    }
    return arr;
}

module.exports = patternBasedBT;