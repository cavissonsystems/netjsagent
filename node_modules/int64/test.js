int64 = require('./index');
i2s = int64.hex2dec
s2i = int64.dec2hex;

var a = b = c = d = e = f = g = null;
var test = [
  '-9223372036854775808' , '8000000000000000',
  '9223372036854775807'  , '7fffffffffffffff',
  '1311768467294899695'  , '1234567890abcdef',
  '-81985529216486896'   , 'fedcba9876543210',
  '4294967295'           , 'ffffffff',
  '2147483647'           , '7fffffff',
  '0'                    , '0',
]
console.time('int64ToString');
for (var i = 0; i < test.length; i+=2) {
  str = i2s(test[i+1]);
  if (str === test[i]) {
    console.log('OK from ' + test[i+1] + ' to ' + test[i]);
  } else {
    throw new Error('ERR from ' + test[i+1] + ' to ' + str + '; expect ' + test[i]);
  }
}

test = [

'8000000000000000', '-9223372036854775808',
'7fffffffffffffff', '9223372036854775807',
'1234567890abcdef', '1311768467294899695',
'fedcba9876543210', '-81985529216486896',
'00000000ffffffff', '4294967295',
'000000007fffffff', '2147483647',
'0000000000000000', '0',

]

console.log('---------------');
console.time('stringToInt64');
for (var i = 0; i < test.length; i+=2) {
  str = s2i(test[i+1]);
  if (str === test[i]) {
    console.log('OK from ' + test[i+1] + ' to ' + test[i]);
  } else {
    throw new Error('ERR from ' + test[i+1] + ' to ' + str + '; expect ' + test[i]);
  }
}

console.log('all done')
