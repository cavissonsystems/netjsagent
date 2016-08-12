crypto = require 'crypto'
int64 = require './index'
hex2dec = int64.hex2dec
dec2hex = int64.dec2hex

times = process.argv[2]
number = process.argv[3]
numbers = []

main = (err, buf)->
  if number
    numbers.push number
  else
    numbers.push buf.toString('hex')
  if numbers.length >= times
    console.log '----------------------'
    res = [];
    time = process.hrtime()
    console.log 'begin hex2dec bench'
    res.push(hex2dec(numbers[i])) for i in [0...times]
    time1 = process.hrtime()
    total = (time1[0] - time[0]) * 1000000000 + time1[1] - time[1]
    console.log 'done'
    console.log "total #{Math.round(total/10000)/100} ms"
    console.log "average #{Math.round(total/times/10)/100} microsec"
    console.log '----------------------'

    console.log 'begin dec2hex bench'
    for i in [0...times]
      throw new Error "transback fail from #{res[i]} to #{dec2hex res[i]} expect #{numbers[i]}." unless numbers[i] is dec2hex res[i]
    time1 = process.hrtime()
    total = (time1[0] - time[0]) * 1000000000 + time1[1] - time[1]
    console.log 'done'
    console.log "total #{Math.round(total/10000)/100} ms"
    console.log "average #{Math.round(total/times/10)/100} microsec"
    console.log '----------------------'

console.log "#{times} randmoize hexcodes generating..."
for i in [0...times]
  crypto.randomBytes 8, main
