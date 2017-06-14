/**
 * Created by Siddhant on 25-09-2016.
 */

var threshold = require('./threshold');

function bt (id, name, threshold, btIncluMode) {
    this.btId=id;
    this.btName = name;
    this.threshold = threshold;
    this.isMetadataDumped = false           //This field will specify, is meta dumped or not
    this.btIncluMode=btIncluMode;           //Adding this field for btIdvsName map for include/exclude bts
}

bt.prototype.getBtId = function()
{
    return this.btId;
}

bt.prototype.setBtId = function(btId)
{
    this.btId = btId;
}

bt.prototype.getThreshold = function()
{
    return this.threshold;
}

bt.prototype.setThreshold = function(threshold)
{
    this.threshold = threshold;
}

/*bt.getOtherBT = function(){
    try {
        var OtherBt = new bt('1', 'Others', threshold.getDefaultThreshold());
        return OtherBt;
    }catch(err) {

    }

}*/

module.exports = bt;