/**
 * Created by Siddhant on 26-12-2016.
 */

var ndExceptionMonitor = require('./ndExceptionMonitor');

function ndExceptionManager(){

}

/**
 * Monitoring flag - 0x01 - Used for enabling monitoring of a exception class choosen by User
 */
ndExceptionManager.ND_Exception_Monitor_ON = 0x01; // Bit 1 - Method is monitored for generating graph data
//Bits 2 to 7 are for future use

/**
 * This collection will keep each specified Exceptions with an unique ID as value at the time of an exception gets discovered - Since start of JVM
 */
ndExceptionManager.allExceptionIDMap = new Object();

/**
 * This collection will keep each specified exceptions with an unique ID as value at the time of an exception gets discovered - For a single test
 */
ndExceptionManager.currentExceptionsPropMap = new Object();

/**
 * Unique id for every monitoring conditions which is generated at the time of discovery.
 */
ndExceptionManager.exceptionID = 0;

/**
 * ArrayList of objects containing properties (like condnStr, alias, monitoring id, condFlag) stored at the time of Condition discovery.
 */
ndExceptionManager.exceptionPropList = [];

/**
 * This Method will check the conditionIDlookup Map, and If current condition is new one, will generate a ID and keep condition string as key and ID as value .
 * @param excptionStr
 * @return
 */
ndExceptionManager.setExceptionID = function(excptionStr)
{
    try
    {
        var id = ndExceptionManager.getNextExceptionID();
        ndExceptionManager.allExceptionIDMap[excptionStr] = id;
        return id;
    }
    catch(err)
    {
        return -1;
    }
}

/**
 * Sets the property of a condition discovered and creates a default model if it is monitored
 * @param exceptnStr
 * @param displayName
 * @param methodFlag
 * @return
 */
ndExceptionManager.addExceptionAtDiscovery = function(exceptnStr, displayName, exceptnID, flag)
{
    /*if(ndExceptionMonitor.traceLevel > 1)
        NDListener.logBCITrace(Server.TestRunIDValue, "", "", "Exception Discovered. Name : " + exceptnStr);*/

    //add properties of a condition - conditionString, displayName, conditionID, conditionFlag
    ndExceptionManager.addExceptions(exceptnStr, displayName, exceptnID, flag);

    //Create default model for every monitoring http conditions in conditionMonitoringList. where model is NDMethodMonitorDataModel and inside this object methodid and defaultHashMap for every thread will be present.
    ndExceptionMonitor.addDefaultModelInConditionMonitorList(exceptnID);

    return exceptnID;
}

/**
 * This method will add a new method in methodProperties object and than at the methodID th index inside arrayList of methodProperties object.
 * Which will use in generating method monitoring records at the time of method exit point by checking monitoring flag set inside method properties.
 * @param exceptnName - fully qualified method name
 * @param display - display name of every method - NA for non monitoring methods and alias name for monitoring methods specified inside monitoring list
 * @param methodID - ID of every executed methods ( both monitored methods and non monitored list)
 * @param monitoingMethodID - ID of every monitored methods executed or dicovered
 * @Hint At the time of discovery from this class
 */
ndExceptionManager.addExceptions = function(exceptnName, display, exceptnID, exceptnFlag)
{
    /*if(NDExceptionMonitor.traceLevel > 1)
        NDListener.logBCITrace(Server.TestRunIDValue, "", "", "Adding Inside Condition properties Object. Where Condition String : " + exceptnName + " , display Name " + display + " , conditionID " + exceptnID + " , condnFlag " + exceptnFlag + " Added inside condition propList.");*/

    //check size of condition property list, if size is smaller than index double the size of propList
    exceptnID = ndExceptionManager.checkSizeOfExceptionPropList(exceptnID);

    if(-1 == exceptnID)
    {
        //Not expected ..
        /*if(NDExceptionMonitor.traceLevel > 1)
            NDListener.logBCITrace(Server.TestRunIDValue, "", "", "Unable to Add Inside Condition properties Object. Where Condition String : " + exceptnName + " , display Name " + display + " , conditionID " + exceptnID + " , condnFlag " + exceptnFlag + " Added inside condition propList.");*/
        return;
    }

    //Create Evalution Object for current condition
    var obj = ndExceptionManager.ExceptionProperties();
    exceptionPropList[exceptnID] = obj.ndExceptionManager.keepExceptionProperties(exceptnName, display, exceptnID, exceptnFlag);

    if(ndExceptionMonitor.traceLevel > 1)
        NDListener.logBCITrace(Server.TestRunIDValue, "", "", "Showing property for conditions : " + exceptnName + " , display Name " + display + " , conditionID " + exceptnID + " , condnFlag " + exceptnFlag + " Added inside condition propList.");
}

    /*ndExceptionManager.ExceptionProperties = function(){
        this.exceptionName = null;//Condition Expression string
        this.exceptionDisplayName = null;//Condition Monitor -DisplayName
        this.exceptionID = -1;//ID of condition
        this.exceptionFlag = 0;//condition flag, weather to dump data or not?
    }

    ndExceptionManager.keepExceptionProperties = function(ExceptionStr, display, iD, Flag)
    {
        exceptionName = ExceptionStr;d

        exceptionDisplayName = display;
        exceptionID = iD;
        exceptionFlag = Flag;
        return this;
    }*/

/**
 * This method checks the allocated size of ExceptionPropertyList, if no sufficient size available, it re-allocates double size of current List
 * @param eID
 * @return
 */
ndExceptionManager.checkSizeOfExceptionPropList = function(eID)
{
    try
    {
        while(true)
        {
            if(eID >= ndExceptionManager.exceptionPropList.length) //Method ID Starts from 1,so checking the methodid is greater than equal to length of the Array
            {
                /*if(NDExceptionMonitor.traceLevel > 1)
                    NDListener.logBCITrace(Server.TestRunIDValue, "", "", " current index is larger than size of conditionPropList, so making size of methodPropArrList to double of current size = " + exceptionPropList.length + " cid = " + eID);*/

                //ExceptionProperties[] oldObj = exceptionPropList;
                if(NDExceptionMonitor.traceLevel > 1)
                    NDListener.logBCITrace(Server.TestRunIDValue, "", "", " size of old condPropArrList = " + oldObj.length);

                exceptionPropList = new ExceptionProperties[oldObj.length * 2];

                //assigning all prev elements to current one
                for(var i = 0; i < oldObj.length; i++)
                {
                    exceptionPropList[i] = oldObj[i];
                }

                /*if(NDExceptionMonitor.traceLevel > 1)
                    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "New Size of conditionPropList = " + exceptionPropList.length + " cid= " + eID);*/
            }

            //if still not sufficient, we need to reassign
            if(eID < exceptionPropList.length)
                break;

            /*if(NDExceptionMonitor.traceLevel > 1)
                NDListener.logBCITrace(Server.TestRunIDValue, "", "", "As No sufficient size allocated, so reallocating conditionPropList size. current size " + exceptionPropList.length + " Cid = " + eID);*/
        }

        //Now we need to keep current condition's properties at condition IDth index
        if(null == exceptionPropList[eID])
        {
            return eID;
        }

    }
    catch(err)
    {
        //NDListener.logBCIError(Server.TestRunIDValue, "NDExceptionManager", "checkSizeMethodPropList", "Exception in allocating size . Index (condition ID) = " + eID + ", Exception ", e);
    }

    return -1;
}


/**
 * Generate and Give Next monitoring method id
 * @return previousMonitroingID + 1
 */
ndExceptionManager.getNextExceptionID = function()
{
    return ++ndExceptionManager.exceptionID;
}

/**
 * get exception ID, used to generate id
 * @param exceptionClassName
 * @return null if no exception found
 */
ndExceptionManager.getExceptionID = function(exceptionClassName){
    try
    {
        if(null == ndExceptionManager.allExceptionIDMap[exceptionClassName])
            return null;
        else
            return ndExceptionManager.allExceptionIDMap[exceptionClassName];
    }
    catch(err)
    {
        return null;
    }

}

module.exports = ndExceptionManager;