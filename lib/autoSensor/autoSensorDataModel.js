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

    MinTimeNewHotSpotThreads = Number.MAX_VALUE;
    MaxTimeNewHotSpotThreads = 0;
    TotalCountNewHotSpotThreads = 0;
    TotalTimeNewHotSpotThreads =0;

     numOfBlockedThreads=0;
     numOfRunnableThreads=0;
     numOfTerminatedThreads =0;
     numOfTimedWaitingThreads =0;
     numOfWaitingThreads =0;
    
}

ASDataModel.setHotSpotDuration = function(time,isNew)
{

     TotalTimeAllHotSpotThreads += time;
     TotalCountAllHotSpotThreads++;

     if(MinTimeAllHotSpotThread > time)
     {
          MinTimeAllHotSpotThread = time;
     }
     if(MaxTimeAllHotSpotThread < time)
     {
          MaxTimeAllHotSpotThread = time;
     }

     if(isNew)
     {
          if(MinTimeNewHotSpotThreads > time)
          {
               MinTimeNewHotSpotThreads = time;
          }
          if(MaxTimeNewHotSpotThreads < time)
          {
               MaxTimeNewHotSpotThreads= time;
          }

          TotalTimeNewHotSpotThreads+= time;
          TotalCountNewHotSpotThreads++;

     }
}

ASDataModel.resetCounter = function(){
    MinTimeNewHotSpotThreads = Number.MAX_VALUE;
    MaxTimeNewHotSpotThreads = 0;
    TotalCountNewHotSpotThreads = 0;
    TotalTimeNewHotSpotThreads =0;
}

ASDataModel.getTotalCountAllHotSpotThreads = function(){
    return TotalCountAllHotSpotThreads;
}
ASDataModel.getAvgTimeAllHotSpotThreads = function(){
    if(TotalCountAllHotSpotThreads == 0)
        return 0;

    return ((TotalTimeAllHotSpotThreads/TotalCountAllHotSpotThreads)/1000);

}
ASDataModel.getMinTimeAllHotSpotThread = function(){
    if(TotalCountAllHotSpotThreads == 0)
        return 0;
    return (MinTimeAllHotSpotThread/1000);

}
ASDataModel.getMaxTimeAllHotSpotThread = function(){
    return (MaxTimeAllHotSpotThread/1000);
}

ASDataModel.getAvgTimeNewHotSpotThreads = function(){
    if(TotalCountNewHotSpotThreads == 0)
        return 0;
    return ((TotalTimeNewHotSpotThreads/TotalCountNewHotSpotThreads)/1000);

}
ASDataModel.getMinTimeNewHotSpotThreads = function(){
    if(TotalCountNewHotSpotThreads == 0)
        return 0;
    return (MinTimeNewHotSpotThreads/1000);


}
ASDataModel.getMaxTimeNewHotSpotThreads = function(){
    return (MaxTimeNewHotSpotThreads/1000);

}
ASDataModel.getTotalCountNewHotSpotThreads = function(){
    return TotalCountNewHotSpotThreads;

}


module.exports = ASDataModel;