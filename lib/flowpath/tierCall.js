/**
 * Created by Sahil on 7/12/16.
 */

function tierCall(){
    this.seqId ;
    this.methodId ;
    this.executionTime ;
    this.backendType ;                   //Backend type :- Http:"1" , PG:"2" , MongoDB:"3"
    this.subType;
    this.queryStartTimeSec ;
    this.status = 0;
    this.statusCode=0;
    this.networkDelayInRequest = -1;
    this.networkDelayInResponse = -1;
}


tierCall.prototype.generate_T= function (sb) {
    //T5:3:1:2:1:0_
    //if(this.seqId && this.methodId && this.executionTime &&this.backendType &&this.queryStartTimeSec  && this.statusCode) {
        if (this.status == 0) {
            sb.add('T')
        } else if (this.status == 1) {
            sb.add('E')
        }
        sb.add(this.seqId)
        sb.add(':')
        sb.add(this.methodId)
        sb.add(':')
        sb.add(this.executionTime)
        sb.add(':')
        sb.add(this.backendType)
        sb.add(':')
        if (this.subType) {
            sb.add(this.subType)
            sb.add(':')
            sb.add(this.queryStartTimeSec)
        }
        else {
            sb.add('-')
            sb.add(':')
            sb.add(this.queryStartTimeSec)
        }
        if (this.status == 1 && this.statusCode > 0) {
            sb.add(':');
            sb.add(this.statusCode);
        }
        sb.add(':0:')
        if(this.networkDelayInRequest > -1 )
            sb.add(this.networkDelayInRequest)
        sb.add(':')
        if(this.networkDelayInResponse > -1)
            sb.add(this.networkDelayInResponse)
        sb.add('_')
    //}
}

//Generating "T" record
tierCall.prototype.encode= function (sb)
{
     this.generate_T(sb);

}


exports.tierCall = tierCall;