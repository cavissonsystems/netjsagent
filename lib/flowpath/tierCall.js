/**
 * Created by Sahil on 7/12/16.
 */

function tierCall(){
    this.seqId ;
    this.methodId ;
    this.executionTime ;
    this.backendType ;                   //Backend type :- Http:"1" , PG:"2" , MongoDB:"3"
}


tierCall.prototype.generate_T= function (sb)
{
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
    sb.add('-')
    sb.add('_')

    return sb ;
}

//Generating "T" record
tierCall.prototype.encode= function (sb)
{
    var data = this.generate_T(sb);
    return data.toString();

    //return 'T' + this.seqId + ':' + this.methodId + ':' + this.executionTime + ':' + this.backendType + ':' + '-' + '_'
}


exports.tierCall = tierCall;