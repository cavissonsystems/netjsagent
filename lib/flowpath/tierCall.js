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
}


tierCall.prototype.generate_T= function (sb) {
    sb.clear();

    sb.add('T')
    sb.add(this.seqId)
    sb.add(':')
    sb.add(this.methodId)
    sb.add(':')
    sb.add(parseInt(this.executionTime))
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
    }
    sb.add('_')

    return sb ;
}

//Generating "T" record
tierCall.prototype.encode= function (sb)
{
    var data = this.generate_T(sb);
    console.log(data)
    return data.toString();
}


exports.tierCall = tierCall;