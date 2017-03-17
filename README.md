Introduction
===

Cavisson Netjsagent is a part of Netdaignostics Enterprise (NDE),it is a comprehensive Application Performance Management (APM) solution for real-time monitoring, diagnostics and management of distributed processing in your application environment using state of art technologies with minimal overhead. Leading Fortune 500 brands rely on NDE to avert risks, reduce revenue loss, and improve customer loyalty by enabling proactive monitoring and real-time diagnosis of application performance issues.

Why Netjsagent?
NDE provides simple and intuitive view of live application traffic and all contextual analysis germane to the monitoring and diagnostics. Following makes NDE, the most advanced APM offering:

    End-to-end business transaction-centric monitoring and diagnostics
    Comprehensive system level as well as service level monitoring
    Deep diagnostics up to code / method level root cause analysis
    Powerful dashboard features with an exclusive executive dashboard for business KPI monitoring
    Big-data analytics, analyze millions of metrics, focus on those which matter

Installing the Node.js agent
--
You can install the latest version by typing the following command from the root directory of the Node.js application that you are instrumenting:

```sh
npm install netjsagent
```

If you know which specific version of the Node.js agent you want to install, you can specify it:

```sh
npm install netjsagent@<version>
```
Then paste the following in your application  as the very first line of your application source code, before any other require statement,you can get the main file of application from package.json:

```sh
require("netjsagent").instrument()
```
Now create a new file <ndsettings.conf> in the root directory of Node.js application:

```sh
tier=NodeJS

server=Mew

instance=CAV-NODE

ndcHost=localhost

ndcPort=7892

#eventLoopMonitor=1

#gcProfiler=1

#dynamicThreshold=false

#Mode=shared
```

.
