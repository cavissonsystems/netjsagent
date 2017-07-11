/**
 * Created by Sahil on 7/6/17.
 */

function cavNdSession (){
    this.methodEntryDepth2SetCookie = 0;
    this.methodExitDepth2SetCookie = 0;
    this.setCookieOnResponseCommit = false;
    this.setHeaderInResponse = false;
    this.fPIHeaderName="CavNV";
    this.xHeaderName = "X-CavNV";
    this.NVSid = "CavSID";
    this.NVPid = "CavPI";
    this.NVCookie = "CavNVC";
    this.cookieDomainName = null;
    this.enableFPHdrInRep = false;
    this.ndSessionIdleTimeOutSecs = 30 * 60 * 1000;     //30 minutes
    this.maxFPCountInSession = 1000;
}

cavNdSession.prototype.parseNDSessionKeywords = function(keywordValue){
    this.reset()
    //if(httpCaptureTraceLevel > 3)
    //    NDListener.logBCITrace(Server.TestRunIDValue, "", "", "enableFPIDInRep called.");

    if (!keywordValue || keywordValue === ("") || keywordValue === ("-"))
        return;

    var strTemp = keywordValue.split("%20");

    if(strTemp.length > 2) {
        this.methodEntryDepth2SetCookie = parseInt(strTemp[0]);
        this.methodExitDepth2SetCookie = parseInt(strTemp[1]);
        this.setCookieOnResponseCommit = parseInt(strTemp[2]) == 1 ? true : false;
        this.setHeaderInResponse = parseInt(strTemp[3]) == 1 ? true : false;
        if(strTemp.length > 4) {
            this.fPIHeaderName = strTemp[4].trim();
            this.xHeaderName = 'X-'+strTemp[4].trim();
        }
        if(strTemp.length > 5) {
            if(strTemp[5] && !('' === strTemp[5]) && ('-' !== strTemp[5]))
                this.cookieDomainName = strTemp[5];
        }
        if(strTemp.length > 6)
            this.ndSessionIdleTimeOutSecs = parseInt(strTemp[6] * 1000);
        if(strTemp.length > 7) {
            if (strTemp[7] && !('' === (strTemp[7])) && ('-' !== strTemp[7]))
                this.maxFPCountInSession = strTemp[7];
        }

        if(this.methodEntryDepth2SetCookie > 0 || this.methodExitDepth2SetCookie > 0 || this.setCookieOnResponseCommit)
            this.enableFPHdrInRep = true;
        else
            this.enableFPHdrInRep = false;
    }
    else {
        //NDListener.logBCIError(Server.TestRunIDValue, "NDHttpCaptureSettings", "enableFPIDInRep", "invalid keyword value for enableNDSession - " + strKeywordValue);
    }
}

cavNdSession.prototype.reset =  function(){
    this.methodEntryDepth2SetCookie = 0;
    this.methodExitDepth2SetCookie = 0;
    this.setCookieOnResponseCommit = false;
    this.setHeaderInResponse = false;
    this.fPIHeaderName="CavNV";
    this.xHeaderName = "X-CavNV";
    this.NVSid = "CavSID";
    this.NVPid = "CavPI";
    this.NVCookie = "CavNVC";
    this.cookieDomainName = null;
    this.enableFPHdrInRep = false;
    this.ndSessionIdleTimeOutSecs = 30 * 60 * 1000;     //30 minutes
    this.maxFPCountInSession = 1000;
}

module.exports= cavNdSession;