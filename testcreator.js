const config = require('./config.json')
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken')
const webprivkey = require('fs').readFileSync('./keys/webpriv.pem')

console.log("a uuid 4 u <3 - " + uuidv4())
console.log(jwt.sign(
    {
        "name":"Aaryan",
        "type":"GOLD",
        "phone":"8985881268",
    },
    webprivkey,
    {algorithm:'RS256'}
))