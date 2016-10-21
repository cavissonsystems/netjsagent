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
}


tierCall.prototype.generate_T= function (sb) {
        //T5:3:1:2:1:0_
		if (this.status == 0) {
        sb.add('T')
		} else if(this.status == 1){
        sb.add('E')
		}
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
		if(this.status == 1) {
        sb.add(':');
        sb.add(this.queryStartTimeSec);




        sb.add(':');
        sb.add("");
    }
        sb.add('_')
}

//Generating "T" record
tierCall.prototype.encode= function (sb)
{
     this.generate_T(sb);

}


exports.tierCall = tierCall;