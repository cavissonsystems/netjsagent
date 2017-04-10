
/**
 * Created by Harendra on 26-03-2017.
 */
var btManager = require('./btManager');
var threshold = require('./threshold');
var util = require('../util');
var btNameIdMap = {};
var stateMachine;
var wholeList = [];
var STARTWITHMATCH = 18;
var EXACTMATCH = 17;
var SKIPFLAG = 19;
var EXACT_MATCH_MODE = 0;
var STARTS_WITH_MODE = 1;

function patternBasedBT(){}
patternBasedBT.generatePatternBasedBTStateMachine = function (data) {
    try {
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
        patternBasedBT.createStateMachineTable()
    }
    catch(e){
        util.logger.error(e)
    }
}

patternBasedBT.createAndGetPatternBasedBTDefinition = function (tempDataArray) {
    var patternBasedBTDefinition = {};
    patternBasedBTDefinition.transactionName = tempDataArray[1].trim();
    btNameIdMap[tempDataArray[2]] = tempDataArray[1];
    var excludeMode = 0;
    try {
        excludeMode = parseInt(tempDataArray[5].trim());
    }
    catch (err) {
        excludeMode = 0;
        return null;
    }
    var transactionId = -2;
    if (excludeMode == 0) {
        try {
            transactionId = parseInt(tempDataArray[2].trim());
        }
        catch (err) {
            return null;
        }
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
    try {
        var btObj;
        if (excludeMode == 0) {
            btObj = btManager.getBtObj(patternBasedBTDefinition.transactionName);
            if (btObj == null || btObj == undefined ) {
                var thresholdObj = threshold.getDefaultThreshold();
                btManager.insertBT(transactionId, patternBasedBTDefinition.transactionName, thresholdObj);
            }
            else if (btObj.btId == null || btObj.btId == undefined) {
                btManager.insertID(patternBasedBTDefinition.transactionName, transactionId);
            }
        }
    }
    catch (err){
        util.logger.error(err);
    }
    return patternBasedBTDefinition;

}
patternBasedBT.createStateMachineTable = function () {
    try{

        var i = 0;
        var nextState = 0;
        var curState = 0;
        var businessTrasactionList;
        try {
            stateMachine = Create2DArray(128); //Creating 2D array of size 128
            businessTrasactionList = wholeList;//patternBasedBTDTO.getPatternBasedBTDefinitionList();
        }
        catch (err){
            console.log(" error",err);
        }
        for (bto in businessTrasactionList) {
            var pattern = businessTrasactionList[bto].pattern;
            //TODO:Handle skipCharacter case
            // patternBasedBTDTO.noOfskipChar;
            curState = 0;
            for (i in pattern) {
                var curVal = 0;
                var currentChar = pattern.charCodeAt(i);
                if (!isCharInPrintableRange(currentChar)) {
                    break;
                }
                if (currentChar == '*') {
                    if (i == (pattern.length - 1))//No more characters left add transaction
                    {
                        // skip flag (*) is not allowed at the end of uri string it will come only if parameter validation is enabled
                        if (businessTrasactionList[bto].patternMode < 2)
                            stateMachine[EXACTMATCH][curState] = businessTrasactionList[bto].btId;
                        //not expected
                        if (businessTrasactionList[bto].matchType() == STARTS_WITH_MODE && businessTrasactionList[bto].patternMode < 2)
                            stateMachine[STARTWITHMATCH][curState] = businessTrasactionList[bto].btId;

                        continue;
                    }
                    currentChar = pattern[++i];
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
                if (i == (pattern.length - 1)) { // last character
                    if (businessTrasactionList[bto].matchType == EXACT_MATCH_MODE) {
                        if (stateMachine[EXACTMATCH][curState] !== undefined) {
                        }
                        if (Number(businessTrasactionList[bto].patternMode) < 2)
                            stateMachine[EXACTMATCH][curState] = businessTrasactionList[bto].btId;
                    }
                    else {
                        if (stateMachine[STARTWITHMATCH][curState] !== undefined) {
                        }

                        if (Number(businessTrasactionList[bto].patternMode) < 2)
                            stateMachine[STARTWITHMATCH][curState] = businessTrasactionList[bto].btId();
                    }
                }

            }
            if (Number(bto.patternMode) < 2)
                continue;
        }

    }
    catch (err){
        util.logger.error(err);
    }

}
function isCharInPrintableRange(currentChar) {
    if (Number(currentChar) > 31 && Number(currentChar) < 128)
        return true;
    else
        return false;
}
//This function fetch btId from stateMC, args:url
 patternBasedBT.getBTIDFromURL = function(url) {
    try {
        var nextState = 0;
        var i = 0;//NoOfskipChar
        var lastTxID = -1;
        var value;
        var skipIdx = 0;
        for (i = 0; i < url.length; i++) {
            var curChar = url.charCodeAt(i);
            if (!isCharInPrintableRange(curChar)) {
                lastTxID = -1;
                break;
            }
            value = stateMachine[curChar][nextState];
            if (value) {
                if (i == (url.length - 1)) {
                    if (stateMachine[EXACTMATCH][value] != undefined)
                        return btNameIdMap[stateMachine[EXACTMATCH][value]];
                    else if (stateMachine[STARTWITHMATCH][value] != undefined)
                        return btNameIdMap[stateMachine[STARTWITHMATCH][value]];
                    else
                        return btNameIdMap[lastTxID];
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
                if (stateMachine[SKIPFLAG][nextState] || skipIdx != 0) {
                    if (stateMachine[SKIPFLAG][nextState])
                        skipIdx = nextState;
                    nextState = skipIdx;
                    continue;
                }
                return btNameIdMap[lastTxID];
            }
        } // End of for
        //TODO: return only btId and handle further cases on id basis.
        return btNameIdMap[lastTxID]; //map contain btId as a key and btName as value, because in previous design we need name to process and fetch value from another map.
    }
    catch (err){
        util.logger.error(err);
        return btNameIdMap[lastTxID];
    }
}
function Create2DArray(rows) {
    var arr = [];
    for (var i=0;i<rows;i++) {
        arr[i] = [];
    }
    return arr;
}
module.exports = patternBasedBT;