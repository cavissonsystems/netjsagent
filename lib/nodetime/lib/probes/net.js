/*
 * Copyright (c) 2012 Dmitri Melikyan
 *
 * Permission is hereby granted, free of charge, to any person obtaining a 
 * copy of this software and associated documentation files (the 
 * "Software"), to deal in the Software without restriction, including 
 * without limitation the rights to use, copy, modify, merge, publish, 
 * distribute, sublicense, and/or sell copies of the Software, and to permit 
 * persons to whom the Software is furnished to do so, subject to the 
 * following conditions:
 * 
 * The above copyright notice and this permission notice shall be included 
 * in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN 
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR 
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR 
 * THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


var proxy = require('../proxy');
var samples = require('../samples');
var info = require('../info');

module.exports = function(obj) {
//  return; // needs rethinking

  proxy.after(obj, ['connect', 'createConnection'], function(obj, args, ret) {
      //console.log("*********",ret)
    proxy.before(ret, 'write', function(obj, args) {
        //console.log('Write: ',ret)
      if(args.length < 1) return;
        //console.log('Sockets', 'Data write per minute', size(args[0]), 'KB', 'sum')
      //info.metric('Sockets', 'Data sent per minute', size(args[0]), 'KB', 'sum');
    });

    proxy.before(ret, 'on', function(obj, args) {
        //console.log('Read: ',ret)
      if(args.length < 2 || args[0] !== 'data') return;
  
      proxy.callback(args, -1, function(obj, args) {
         // console.log(args[0].toString())

          //console.log('Sockets', 'Data received per minute', size(args[0]), 'KB', 'sum')
          //info.metric('Sockets', 'Data received per minute', size(args[0]), 'KB', 'sum');
      });
    });
  });
};

var size = function(data) {
  var bytes = 0;
  
  if(Buffer.isBuffer(data)) {
    bytes = data.length;
  }
  else if(typeof data === 'string') {
    bytes = data.length; // yes I know, this is wrong!!!
  }

  return (bytes / 1000);
};
