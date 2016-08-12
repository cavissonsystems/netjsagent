
var z64 = '0000000000000000000000000000000000000000000000000000000000000000';

var hex2bin = {
  '0': '0000', '1': '0001', '2': '0010', '3': '0011',
  '4': '0100', '5': '0101', '6': '0110', '7': '0111',
  '8': '1000', '9': '1001', 'a': '1010', 'b': '1011',
  'c': '1100', 'd': '1101', 'e': '1110', 'f': '1111'
};
var negHex2bin = {
  '0': '1111', '1': '1110', '2': '1101', '3': '1100',
  '4': '1011', '5': '1010', '6': '1001', '7': '1000',
  '8': '0111', '9': '0110', 'a': '0101', 'b': '0100',
  'c': '0011', 'd': '0010', 'e': '0001', 'f': '0000'
};

var bin2hex = {
  '0000': '0', '0001': '1', '0010': '2', '0011': '3',
  '0100': '4', '0101': '5', '0110': '6', '0111': '7',
  '1000': '8', '1001': '9', '1010': 'a', '1011': 'b',
  '1100': 'c', '1101': 'd', '1110': 'e', '1111': 'f'
};

var negBin2hex = {
  '1111': '0', '1110': '1', '1101': '2', '1100': '3',
  '1011': '4', '1010': '5', '1001': '6', '1000': '7',
  '0111': '8', '0110': '9', '0101': 'a', '0100': 'b',
  '0011': 'c', '0010': 'd', '0001': 'e', '0000': 'f'
};

var map = [
  [1],
  [2],
  [4],
  [8],
  [1, 6],
  [3, 2],
  [6, 4],
  [1, 2, 8],
  [2, 5, 6],
  [5, 1, 2],
  [1, 0, 2, 4],
  [2, 0, 4, 8],
  [4, 0, 9, 6],
  [8, 1, 9, 2],
  [1, 6, 3, 8, 4],
  [3, 2, 7, 6, 8],
  [6, 5, 5, 3, 6],
  [1, 3, 1, 0, 7, 2],
  [2, 6, 2, 1, 4, 4],
  [5, 2, 4, 2, 8, 8],
  [1, 0, 4, 8, 5, 7, 6],
  [2, 0, 9, 7, 1, 5, 2],
  [4, 1, 9, 4, 3, 0, 4],
  [8, 3, 8, 8, 6, 0, 8],
  [1, 6, 7, 7, 7, 2, 1, 6],
  [3, 3, 5, 5, 4, 4, 3, 2],
  [6, 7, 1, 0, 8, 8, 6, 4],
  [1, 3, 4, 2, 1, 7, 7, 2, 8],
  [2, 6, 8, 4, 3, 5, 4, 5, 6],
  [5, 3, 6, 8, 7, 0, 9, 1, 2],
  [1, 0, 7, 3, 7, 4, 1, 8, 2, 4],
  [2, 1, 4, 7, 4, 8, 3, 6, 4, 8],
  [4, 2, 9, 4, 9, 6, 7, 2, 9, 6],
  [8, 5, 8, 9, 9, 3, 4, 5, 9, 2],
  [1, 7, 1, 7, 9, 8, 6, 9, 1, 8, 4],
  [3, 4, 3, 5, 9, 7, 3, 8, 3, 6, 8],
  [6, 8, 7, 1, 9, 4, 7, 6, 7, 3, 6],
  [1, 3, 7, 4, 3, 8, 9, 5, 3, 4, 7, 2],
  [2, 7, 4, 8, 7, 7, 9, 0, 6, 9, 4, 4],
  [5, 4, 9, 7, 5, 5, 8, 1, 3, 8, 8, 8],
  [1, 0, 9, 9, 5, 1, 1, 6, 2, 7, 7, 7, 6],
  [2, 1, 9, 9, 0, 2, 3, 2, 5, 5, 5, 5, 2],
  [4, 3, 9, 8, 0, 4, 6, 5, 1, 1, 1, 0, 4],
  [8, 7, 9, 6, 0, 9, 3, 0, 2, 2, 2, 0, 8],
  [1, 7, 5, 9, 2, 1, 8, 6, 0, 4, 4, 4, 1, 6],
  [3, 5, 1, 8, 4, 3, 7, 2, 0, 8, 8, 8, 3, 2],
  [7, 0, 3, 6, 8, 7, 4, 4, 1, 7, 7, 6, 6, 4],
  [1, 4, 0, 7, 3, 7, 4, 8, 8, 3, 5, 5, 3, 2, 8],
  [2, 8, 1, 4, 7, 4, 9, 7, 6, 7, 1, 0, 6, 5, 6],
  [5, 6, 2, 9, 4, 9, 9, 5, 3, 4, 2, 1, 3, 1, 2],
  [1, 1, 2, 5, 8, 9, 9, 9, 0, 6, 8, 4, 2, 6, 2, 4],
  [2, 2, 5, 1, 7, 9, 9, 8, 1, 3, 6, 8, 5, 2, 4, 8],
  [4, 5, 0, 3, 5, 9, 9, 6, 2, 7, 3, 7, 0, 4, 9, 6],
  [9, 0, 0, 7, 1, 9, 9, 2, 5, 4, 7, 4, 0, 9, 9, 2],
  [1, 8, 0, 1, 4, 3, 9, 8, 5, 0, 9, 4, 8, 1, 9, 8, 4],
  [3, 6, 0, 2, 8, 7, 9, 7, 0, 1, 8, 9, 6, 3, 9, 6, 8],
  [7, 2, 0, 5, 7, 5, 9, 4, 0, 3, 7, 9, 2, 7, 9, 3, 6],
  [1, 4, 4, 1, 1, 5, 1, 8, 8, 0, 7, 5, 8, 5, 5, 8, 7, 2],
  [2, 8, 8, 2, 3, 0, 3, 7, 6, 1, 5, 1, 7, 1, 1, 7, 4, 4],
  [5, 7, 6, 4, 6, 0, 7, 5, 2, 3, 0, 3, 4, 2, 3, 4, 8, 8],
  [1, 1, 5, 2, 9, 2, 1, 5, 0, 4, 6, 0, 6, 8, 4, 6, 9, 7, 6],
  [2, 3, 0, 5, 8, 4, 3, 0, 0, 9, 2, 1, 3, 6, 9, 3, 9, 5, 2],
  [4, 6, 1, 1, 6, 8, 6, 0, 1, 8, 4, 2, 7, 3, 8, 7, 9, 0, 4],
  [9, 2, 2, 3, 3, 7, 2, 0, 3, 6, 8, 5, 4, 7, 7, 5, 8, 0, 8],
  // [1, 8, 4, 4, 6, 7, 4, 4, 0, 7, 3, 7, 0, 9, 5, 5, 1, 6, 1, 6],
  // [3, 6, 8, 9, 3, 4, 8, 8, 1, 4, 7, 4, 1, 9, 1, 0, 3, 2, 3, 2]
];

var maxNumber = '9223372036854775808';
var lenInfo = [ 0,
3,  6,  9,
13, 16, 19,
23, 26, 29,
33, 36, 39,
43, 46, 49,
53, 56, 59,
63]

var trimReg = /^0+/;

// node version check
var ver = process.version.substring(1).split('.');
var useTypedArray = ver[0] * 100000 + ver[1] * 1000 + ver[2] * 1 >= 11013

var arrayPlus = function(base, add) {
  var pos = 19, range = 20 - add.length;
  while (true) {
    if (pos >= range) {
      base[pos] += add[pos - range];
    }
    if (base[pos] > 9) {
      base[pos - 1]++;
      base[pos] -= 10;
    } else if (pos < range) {
      break;
    }
    pos--;
  }
};

var i2s = function(hex) {
  var ls = hs = output = btmp = binary = '', i = pos = 0, negative = false
    number = useTypedArray ?
      new Uint8Array(20) : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                            0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  // check hex
  hex = hex.toLowerCase()
  if (hex.length > 16) {
    throw new Error('Out of Range!');
  }
  // not full
  if (hex.length < 16) {
    for (; i < hex.length; i++) {
      binary += hex2bin[hex[i]];
    }
  // full
  } else {
    // negative
    var h2b = (negative = hex[0] > '7') ? negHex2bin : hex2bin
    binary = h2b[hex[i]].substr(1);
    for (i=1; i < hex.length; i++) {
      binary += h2b[hex[i]];
    }
  }
  // left zero padding
  if (binary.length < 63) {
    binary = z64.substr(0, 63 - binary.length) + binary;
  }

  // check map & calc
  pos = 0
  for (i = binary.length - 1; i >= 0; i--) {
    binary[i] === '1' && arrayPlus(number, map[pos])
    pos++;
  }

  // negative flip back
  negative && arrayPlus(number, map[0]);

  // result tostring
  btmp = '';
  for (i = 0; i < number.length; i++) {
    btmp += number[i];
  }

  // trim left zeropad
  output = btmp.replace(trimReg, '');

  if (output === '') {
    return '0';
  }
  // add '-'
  return negative ? '-' + output : output;

};




var arrayMinus = function(base, num) {
  var lb = base.length, ln = num.length, n=0;
  while (true) {
    n = base[--lb];
    if (--ln >= 0) {
      n -= num[ln];
    }
    if (n < 0) {
      base[lb-1]--;
      n += 10
    } else if (ln < 0) {
      break;
    }
    base[lb] = n
  }
};

var compare = function(a, b) {
  var la = a.length, lb = b.length, fix = la - lb;
  for (var i = 0; i < fix; i++) {
    if (a[i] > 0) {
      return true
    }
  }
  for (; i < la; i++) {
    if (a[i] > b[i-fix]) {
      return true;
    } else if (a[i] < b[i-fix]) {
      return false;
    }
  }
  return true
}



var s2i = function(str) {
  var negative = false, i = pos = len = 0, mapv = now = ''
    number = null,
    binary = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
       0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
       0, 0, 0];
  // trim spaceing
  str = str.trim();
  // if negative
  if (str[0] === '-'){
    negative = true
    str = str.substring(1);
  }

  // check range
  if (str.length > 19 || (str.length === 19 && str > maxNumber)){
    throw new Error('Out of Range! ' + str);
  }
  // to array
  len = str.length
  number = new Array(len);
  for (i = 0; i < len; i++) {
    // number.push(str[i] * 1);
    number[i] = parseInt(str[i])
  }

  // skip head
  pos = lenInfo[len];

  // -1 if negative
  negative && arrayMinus(number, map[0]);

  // main loop
  while (pos >= 0) {
    mapv = map[pos]
    // if number >= map value, mark this bit to 1
    if (compare(number, mapv)) {
      binary[62-pos] = 1
      // minus map value
      arrayMinus(number, mapv);
    }
    pos--;
  }
  // get map of 4bits to hex
  b2h = negative ? negBin2hex : bin2hex
  // first byte
  now = '0' + binary[0] + binary[1] + binary[2];
  str = b2h[now];

  // other bytes
  for(i = 3; i < binary.length; i+=4) {
    now = '' + binary[i] + binary[i+1] + binary[i+2] + binary[i+3];
    str += b2h[now];
  }

  return str;
}

module.exports = i2s
module.exports.hex2dec = i2s
module.exports.int64ToString = i2s
module.exports.dec2hex = s2i
module.exports.stringToInt64 = s2i




