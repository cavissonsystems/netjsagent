/**
 * Created by Harendra Kumar on 10/7/2016.
 */


var MinTimeAllHotSpotThread = Number.MAX_VALUE ;
var MaxTimeAllHotSpotThread = 0;
var TotalCountAllHotSpotThreads = 0;
var TotalTimeAllHotSpotThreads = 0;

var TotalCountNewHotSpotThreads = 0;
var TotalTimeNewHotSpotThreads = 0;
var MinTimeNewHotSpotThreads = Number.MAX_VALUE;
var MaxTimeNewHotSpotThreads = 0;

var numOfBlockedThreads;
var numOfRunnableThreads;
var numOfTerminatedThreads;
var numOfTimedWaitingThreads;
var numOfWaitingThreads;

function ASDataModel() {

     MinTimeAllHotSpotThread = Number.MAX_VALUE ;
     MaxTimeAllHotSpotThread = 0;
     TotalCountAllHotSpotThreads = 0;
     TotalTimeAllHotSpotThreads = 0;

     TotalCountNewHotSpotThreads = 0;
     TotalTimeNewHotSpotThreads = Number.MAX_VALUE;
     MinTimeNewHotSpotThreads ;
     MaxTimeNewHotSpotThreads = 0;

     numOfBlockedThreads=0;
     numOfRunnableThreads=0;
     numOfTerminatedThreads =0;
     numOfTimedWaitingThreads =0;
     numOfWaitingThreads =0;
    
}

ASDataModel.setHotSpotDuration(duration,isNew)
{

}

module.exports = ASDataModel;