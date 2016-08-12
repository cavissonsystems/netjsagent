## Int64

Transform int64 between hex and dec(signed).

## Usage
    
    var int64 = require('int64');
    var hex2dec = int64.hex2dec;
    var dec2hex = int64.dec2hex;
    console.log(hex2dec('1234567890abcdef'));
    console.log(dec2hex('-9223372036854775808'));
