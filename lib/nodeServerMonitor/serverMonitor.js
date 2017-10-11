/**
 * Created by Sahil on 7/1/17.
 */
var events = require('events');
var btManager = require('../BT/btManager'),
    agentSetting = require('../agent-setting'),
    util = require('../util'),
    os = require('os'),
    samples = require('../nodetime/lib/samples'),
    monitors = [];


// ****** Constants ******
var HOST_LISTEN = "0.0.0.0";//listens from anywhere (quite dangerous)
var PORT_LISTEN = 10010;
var MAX_VALUE = Number.MAX_VALUE;//for internal purpose
var STATUS_IDLE = 'IDLE';
var KB = 1024
// ***********************

function serverMonitor(){}
serverMonitor.serverTimer;
/**
 * Removes given server from monitor chain
 *
 * @param server
 */
function removeFromMonitor(server) {
    try {
        if (server && monitors.length > 0) {
            for (var i = 0; i < monitors.length; i++) {
                var mon_server = monitors[i];
                if (mon_server['server'] == server) {
                    util.logger.info("Server " + (server ? (server.address()['address']):'') + ":" + (server ? server.address()['port'] :'')
                        + " stopped and removed from monitors chain");
                    monitors.splice(i, 1);// remove monitored element
                }
            }
        }
    }
    catch(er){util.logger.error('Error in removeFromMonitor',er)}
}

function monitorResultsClean(mon_server) {
    try {
        mon_server['requests'] = mon_server['post_count'] = mon_server['get_count'] = mon_server['head_count'] = mon_server['put_count'] = 0;
        mon_server['delete_count'] = mon_server['options_count'] = mon_server['trace_count'] = mon_server['time'] = 0;
        mon_server['avr_time'] = mon_server['max_time'] = mon_server['net_time'] = mon_server['avr_net_time'] = mon_server['max_net_time'] = 0;
        mon_server['resp_time'] = mon_server['avr_resp_time'] = mon_server['max_resp_time'] = mon_server['bytes_read'] = 0;
        mon_server['bytes_written'] = mon_server['1xx'] = mon_server['2xx'] = mon_server['3xx'] = mon_server['4xx'] = mon_server['5xx'] = 0;

        mon_server['min_time'] = mon_server['min_net_time'] = mon_server['min_resp_time'] = MAX_VALUE;

        return mon_server;
    }
    catch(er){util.logger.error('Error in monitorResultsClean',er)}
}

function cleanMonitorResults(server) {
    try {
        var ret = false;
        if (server && monitors.length > 0) {
            for (var i = 0; i < monitors.length; i++) {
                if (monitors[i]['server'] == server) {
                    util.logger.debug("cleaning parameters...");
                    monitors[i] = monitorResultsClean(monitors[i]);
                    ret = true;
                    break;
                }
            }
        }
        return ret;
    }
    catch(er){util.logger.error('Error in cleanMonitorResults',er)}
}

function createMon() {
    // monitored data structure
    var mon = {
        // options
        'cumCount':0,
        'collect_all' : false,
        // fixed part
        'server' : null,
        'listen' : "",
        'requests' : 0,
        'post_count' : 0,
        'get_count' : 0,
        'head_count' : 0,
        'put_count' : 0,
        'delete_count' : 0,
        'options_count' : 0,
        'trace_count' : 0,
        // Total
        'time' : 0,
        'avr_time' : 0,
        'min_time' : MAX_VALUE,
        'max_time' : 0,
        // Network latency
        'net_time' : 0,
        'avr_net_time' : 0,
        'min_net_time' : MAX_VALUE,
        'max_net_time' : 0,
        // Server responce time
        'resp_time' : 0,
        'avr_resp_time' : 0,
        'min_resp_time' : MAX_VALUE,
        'max_resp_time' : 0,
        // Read/Writes
        'bytes_read' : 0,
        'bytes_written' : 0,
        // Status codes
        '1xx' : 0,
        '2xx' : 0,
        '3xx' : 0,
        '4xx' : 0,
        '5xx' : 0,
        'serverId':0,
        'timeS' : Date.now(),
        // flexible part
    };
    return mon;
}

/**
 * @param mon_server
 *            the collecting monitored data structure
 * @Dumping composed string that represents a monitoring data
 */

function getMonitorTotalResult(clean) {
    try {
        for (var i = 0; i < monitors.length; i++) {
            var mon = monitors[i];
            mon['min_time'] = Math.min(MAX_VALUE, mon['min_time']);
            mon['max_time'] = Math.max(0, mon['max_time']);

            mon['min_net_time'] = Math.min(MAX_VALUE, mon['min_net_time']);
            mon['max_net_time'] = Math.max(0, mon['max_net_time']);

            mon['min_resp_time'] = Math.min(MAX_VALUE, mon['min_resp_time']);
            mon['max_resp_time'] = Math.max(0, mon['max_resp_time']);

            if (mon['requests']) {
                mon['avr_time'] = parseInt(mon['time'] / mon['requests']);
                mon['avr_resp_time'] = parseInt(mon['resp_time'] / mon['requests']);
                mon['avr_net_time'] = parseInt(mon['net_time'] / mon['requests']);
            }
            dumpServerMonitor(mon)
            if (clean) {
                monitorResultsClean(mon)
            }
            monitors[i] = mon;
        }
    }
    catch(er){util.logger.error('Error in getMonitorTotalResult',er)}
}

function addResultsToMonitor(server,requests, post_count, get_count,head_count,put_count,delete_count,options_count,trace_count,params, status_code, callback) {
    try {
        var ret = false;
        if (server && monitors.length > 0 && typeof params == 'object') {
            var net_duration = params['net_duration'];
            var pure_duration = params['pure_duration'];
            var total_duration = params['total_duration'];
            var bytes_read = params['Read'];
            var bytes_written = params['Written'];
            for (var i = 0; i < monitors.length; i++) {
                var mon_server = monitors[i];
                if (mon_server['server'] == server) {
                    // logger.debug("adding parameters...");
                    mon_server['time'] += total_duration;
                    mon_server['min_time'] = Math.min(total_duration, mon_server['min_time']);
                    mon_server['max_time'] = Math.max(total_duration, mon_server['max_time']);
                    mon_server['resp_time'] += pure_duration;
                    mon_server['min_resp_time'] = Math.min(pure_duration, mon_server['min_resp_time']);
                    mon_server['max_resp_time'] = Math.max(pure_duration, mon_server['max_resp_time']);
                    mon_server['net_time'] += net_duration;
                    mon_server['min_net_time'] = Math.min(net_duration, mon_server['min_net_time']);
                    mon_server['max_net_time'] = Math.max(net_duration, mon_server['max_net_time']);
                    mon_server['requests'] += requests;
                    mon_server['cumCount'] += requests;
                    mon_server['post_count'] += post_count;
                    mon_server['get_count'] += get_count;
                    mon_server['head_count'] += head_count;
                    mon_server['put_count'] += put_count;
                    mon_server['delete_count'] += delete_count;
                    mon_server['options_count'] += options_count;
                    mon_server['trace_count'] += trace_count;

                    mon_server['bytes_read'] += bytes_read;
                    mon_server['bytes_written'] += bytes_written;
                    mon_server['1xx'] += (status_code < 200 ? 1 : 0);
                    mon_server['2xx'] += (status_code >= 200 && status_code < 300 ? 1 : 0);
                    mon_server['3xx'] += (status_code >= 300 && status_code < 400 ? 1 : 0);
                    mon_server['4xx'] += (status_code >= 400 && status_code < 500 ? 1 : 0);
                    mon_server['5xx'] += (status_code >= 500 ? 1 : 0);
                    ret = true;
                    break;
                }
            }
        }
        return (callback ? (callback(!ret)) : (ret));
    }catch(e){util.logger.error(e)}
}

serverMonitor.addMonitor=function(server){
    try {
        var collect_all = false;
        if (server && (monitors.length == 0 || !monitors.some(function (element) {
                return element['server'] == server;
            }))) {
            var mon_server = createMon();
            mon_server['collect_all'] = collect_all;
            mon_server['server'] = server;
            var address = server.address();
            var host = '0.0.0.0';
            var port = 'n.a';
            if (address) {
                port = address['port'];
                host = address['address'];
            }
            if (host === '::' || host === '0.0.0.0')
                host = os.hostname()
            mon_server['listen'] = host + ':' + port;
            monitors.push(mon_server);
            mon_server['serverId'] = monitors.length;

            server.on('close', function (errno) {
                removeFromMonitor(server);
            });

            return mon_server;
        }
        return null;
    }
    catch(er){util.logger.error('Error in addMonitor',er)}
}

serverMonitor.monitorRequest= function(req,res,server,context){
    try {
        req.setMaxListeners(0); // unlimited number of listeners

        var params = {};
        // params['free'] = os.freemem()/os.totalmem()*100;
        // params['cpu'] = sys.inspect(os.cpus());
        //params['Host'] = /* host + ":" + */port;
        //params['Scheme'] = "HTTP";
        params['timeS'] = Date.now();//
        params['Method'] = req.method;
        params["content-length"] = req.headers['content-length'];

        req.on('data', function (obj) {
            params['net_time'] = obj['net_time'] || 0;
        });

        req.on('end', function () {
            var net_time = Date.now();
            params['net_time'] = net_time;
        });

        var socket = req.socket;
        var csocket = req.connection.socket;
        res.setMaxListeners(0);

        res.on('finish', function () {
            params['timeE'] = Date.now();
            params['pure_duration'] = (params['timeE'] - (params['net_time'] || params['timeE']));
            params['net_duration'] = ((params['net_time'] || params['timeE']) - params['timeS']);
            params['total_duration'] = (params['timeE'] - params['timeS']);

            try {
                params['Read'] = socket.bytesRead || csocket.bytesRead;
            } catch (err) {
                params['Read'] = 0;
            }
            try {
                params['Written'] = socket.bytesWritten || csocket.bytesWritten;
            } catch (err) {
                params['Written'] = 0;
            }

            addResultsToMonitor(server, 1, (req.method == "POST" ? 1 : 0), (req.method == "GET" ? 1 : 0), (req.method == "HEAD" ? 1 : 0), (req.method == "PUT" ? 1 : 0),
                (req.method == "DELETE" ? 1 : 0), (req.method == "OPTIONS" ? 1 : 0), (req.method == "TRACE" ? 1 : 0),
                params, res.statusCode, function (error) {
                    if (error)
                        util.logger.error("RES.FINISH-addResultsToMonitor: error while add");
                });
        });
        events.EventEmitter.call(this);
    }
    catch(er){util.logger.error('Error in monitorRequest',er)}
}

function converInKB(bytes){
    return (bytes / KB).toFixed(3);
}

function dumpServerMonitor(mon_server){
    var dataStr = ''
    dataStr += '86,'
    dataStr += agentSetting.vectorPrefixID;
    dataStr += mon_server['serverId']? mon_server['serverId']: 1;
    dataStr += ':';
    dataStr += agentSetting.vectorPrefix;
    dataStr += mon_server['listen'];
    dataStr += '|';
    dataStr += mon_server['cumCount']+' ';
    dataStr += parseInt(mon_server['avr_time'])+' ';
    dataStr += mon_server['min_time']+' ';
    dataStr += mon_server['max_time']+' ';
    dataStr += mon_server['requests']+' ';
    dataStr += mon_server['avr_net_time']+' ';
    dataStr += mon_server['min_net_time']+' ';
    dataStr += mon_server['max_net_time']+' ';
    dataStr += mon_server['requests']+' ';
    dataStr += mon_server['avr_resp_time']+' ';
    dataStr += mon_server['min_resp_time']+' ';
    dataStr += mon_server['max_resp_time']+' ';
    dataStr += mon_server['requests']+' ';
    dataStr += mon_server['bytes_read']+' ';
    dataStr += mon_server['bytes_written']+' ';
    //dataStr += converInKB(mon_server['bytes_read'])+' ';
    //dataStr += converInKB(mon_server['bytes_written'])+' ';
    dataStr += mon_server['1xx']+' ';
    dataStr += mon_server['2xx']+' ';
    dataStr += mon_server['3xx']+' ';
    dataStr += mon_server['4xx']+' ';
    dataStr += mon_server['5xx']+' ';
    dataStr += mon_server['post_count']+' ';
    dataStr += mon_server['get_count']+' ';
    dataStr += mon_server['head_count']+' ';
    dataStr += mon_server['trace_count']+' ';
    dataStr += mon_server['delete_count']+' ';
    dataStr += mon_server['options_count']+' ';
    dataStr += mon_server['put_count']+'\n';
    samples.toBuffer(dataStr)
}

serverMonitor.handleServerMonitor = function(){
    1 == agentSetting.nodeServerMonitor ? (agentSetting.agentMode >=2 ? serverMonitor.startServerMonitor() : serverMonitor.stopServerMonitor()) : serverMonitor.stopServerMonitor();

}

serverMonitor.dumpNodeServerMonitorData =  function (){
    getMonitorTotalResult(true)
}
serverMonitor.startServerMonitor = function (){
    if(serverMonitor.serverTimer === undefined)
        serverMonitor.serverTimer = setInterval(serverMonitor.dumpNodeServerMonitorData, agentSetting.ndMonitorInterval);
}
serverMonitor.stopServerMonitor = function () {
    try {
        util.logger.info(agentSetting.currentTestRun + " | Cleaning Server Monitor");
        clearInterval(serverMonitor.serverTimer);
        serverMonitor.serverTimer=undefined;
    }
    catch(err)
    {util.logger.warn(agentSetting.currentTestRun+" | "+err)}
}
module.exports=serverMonitor;
