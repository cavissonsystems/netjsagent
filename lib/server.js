/**
 * Created by bala on 10/7/15.
 */


var net = require('net');

var HOST = 'localhost';
var PORT = '8899';

var server = net.createServer();
server.listen(PORT, HOST);

console.log('Server listening');
server.on('connection', function(sock) {
   // console.log(EventEmitter)
;
    console.log('connected client :' + sock.remoteAddress + 'port' + sock.remotePort);

    sock.write('nd_ctrl_msg_rep:result=Ok;status=NOT_RUNNING;\n');
    // other stuff is the same from here

   /* setTimeout(function(){
        sock.write("nd_meta_data_req:action=get_thread_dump;Tier=T1;Server=Server1;Instance=ins1;");
    },10000);*/

    // Add a 'data' event handler to this instance of socket
    sock.on('data', function(data) {

        console.log('DATA ' + sock.remoteAddress + ': ' + data);

        sock.write("nd_control_req:action=start_instrumentation;status=starting;nsWDir=/home/netstorm/work;testIdx=6934;nsStartTimeStamp=1433485149;appName=svr26Atg;appID=2;tierName=Tier0;tierID=1;ndAppServerHost=AppServer26;ndAppServerID=1;ndlPort=0;ndAgentPort=0;ndCollectorIP=10.10.60.6;ndCollectorPort=7892;ndVectorSeparator=>;cavEpochDiff=1388534400;ndFlowpathMasks=0x4000400000000000%200x3fffffffff%208%200xff;numInstrProfile=12;instrProfile=Global.xml;size=1451;lmd=1431413657;instrProfile=NewEntry.xml;size=432;lmd=1431413657;instrProfile=AtgStoreSmallWithDB.xml;size=1291;lmd=1431413657;instrProfile=AtgInstrProfile.xml;size=8920;lmd=1431413657;instrProfile=atgtest.xml;size=851;lmd=1431413657;instrProfile=one.xml;size=17217;lmd=1431413657;instrProfile=ecom.xml;size=24837;lmd=1431413657;instrProfile=EstoreoneAtg.xml;size=4489;lmd=1431413657;instrProfile=EstoreAtg2.xml;size=24745;lmd=1431413657;instrProfile=Exception_capturing.xml;size=696;lmd=1431413657;instrProfile=AtgRefStore.xml;size=9560;lmd=1431413657;instrProfile=ATGNewEntryPointsMethodLevelNew.xml;size=2086;lmd=1431457036;instrLog4J=0;collectIndependentQuery=0;NDAppLogFile=NA;ndGenLogCaptureFileList=NA;genNewSQLRecords=1;AppLogTraceLevel=0;instrCPUTime=0;dumpSQLQuery=1;flushInterval=100;bciDataBuffIncreament=0;bciDataBufferMaxCount=512;bciDataBufferMaxSize=32768;socketBufferSize=128;bciUriLogLevel=1;bciUriMaxLength=1024;urlLength=1024;uriQueryLength=1024;bciInstrSessionPct=100;logNonNSFlowpath=0;logNonNSUrlAndQueryRecord=0;bciMaxNonServiceMethodsPerFP=50000;bciMaxServiceMethodsPerFP=5000;logLevelOneFpMethod=1;entryMethodMaxDepth=9999;ctrlConnIdleTimeMaxCount=10;instrProfileContentMaxIdleTime=1;enableBciDebug=4;enableBciError=3;InstrTraceLevel=0;NDEntryPointsFile=NA;SQLTraceLevel=0;SQLPreparedQueryFilter=SELECT 1 FROM DUAL;SQLNonPreparedQueryFilter=SELECT 1 FROM DUAL;captureHttpTraceLevel=0;captureHTTPReqL1Fp=0;captureHTTPReqFullFp=0;captureHTTPRespL1Fp=0;captureHTTPRespFullFp=0;captureHTTPReqBodyL1Fp=0;captureHTTPReqBodyFullFp=0;captureHTTPRespBodyL1Fp=0;captureHTTPRespBodyFullFp=0;hdrListForValueAsId=Content-Encoding,Host,Server,Transfer-Encoding;NDHTTPReqHdrCfgListFullFp=NA;NDHTTPReqHdrCfgListL1Fp=NA;NDHTTPRepHdrCfgListFullFp=NA;NDHTTPRepHdrCfgListL1Fp=NA;ndHttpHdrCaptureFileList=NA;ASSampleInterval=0;ASThresholdMatchCount=5;ASReportInterval=10000;ASReportDumpMode=1;ASStateReport=1;ASStackComparingDepth=10;ASStackCompareOption=1;ASDoNotFilterBlocked=0;ASPositiveThreadFilters=NA;ASNegativeThreadFilter=NA;ASDepthFilter=10;ASTraceLevel=0;ASDataBufferSize=64000;ASDataBufferMaxCount=256;ASDataBufferMinCount=16;ASEnableFPSummaryReport=2;ASResumeDataBuffFreePct=25;ASAllocateDataBuffOnFailure=0;ndMethodMonList=NA;ndMonitorInterval=10000;threadCleanUpCount=5;ndMethodMonTraceLevel=0;HTTPStatsCondCfg=%2Fhome%2Fnetstorm%2Fwork%2Fndprof%2F.config%2FReqConfig.hmc%3Bsize%3D1965%3Blmd%3D1414846481;ndHttpCondMonFileList=NA;captureExceptionTraceLevel=0;instrExceptions=1%201%200%209999%201;ndExceptionMonList=NA;ndExceptionFilterList=java.io.InvalidClassException,java.beans.IntrospectionException,weblogic.utils.encoders.CEStreamExhausted,java.security.PrivilegedActionException,weblogic.servlet.jsp.AddToMapException,java.lang.String,atg.core.util.IntStack,atg.beans.DynamicPropertyConverterImpl,java.io.ObjectStreamClass,java.util.Hashtable$Enumerator,java.io.StringReader,java.lang.ClassLoader,atg.service.scheduler.CalendarSchedule,weblogic.utils.encoders.BASE64Decoder,atg.vfs.zip.ZipVirtualFile,java.beans.PropertyDescriptor,weblogic.utils.classloaders.GenericClassLoader,java.lang.Class,com.sun.el.parser.ELParser,sun.misc.FloatingDecimal,com.sun.el.parser.SimpleCharStream,com.sun.org.apache.xerces.internal.xni.parser.XMLConfigurationException,atg.repository.rql.RqlParser$LookaheadSuccess,java.util.EmptyStackException,java.lang.NoSuchMethodException;setCavNVCookie=1%20CavNV;generateExceptionInMethod=100%20atg.commerce.pricing.priceLists.PriceListManager.getPrice(Latg/repository/RepositoryItem%3BLatg/repository/RepositoryItem%3BLatg")
        sock.write("\n");
        // Write the data back to the socket, the client will receive it as data from the server

         /*setTimeout(function(){
            sock.write("nd_control_req:action=stop_instrumentation;status=stopping;");
         },10000);*/

    });

});



exports.module = server;


