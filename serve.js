console.group("Starting...")

const fs = require('fs')
const https = require('https')
const package = require('./package.json')
const config = require('./config.json')
const express = require('express')
const { MongoClient } = require('mongodb')

const MPServer = require('./src/MPServer.js')
const { sign } = require('crypto')
const app = express()
const mclient = new MongoClient(config.mongodburl)
mclient.connect()

const webpublickey = fs.readFileSync(config.websitePublicKeyPath)
const ticketpublickey = fs.readFileSync(config.issuingPublicKeyPath)
const ticketprivatekey = fs.readFileSync(config.issuingPrivateKeyPath) 

app.use(express.json())

const mpserver = new MPServer(mclient,config,package,ticketprivatekey,ticketpublickey, webpublickey)

console.log(`${package.name} v${package.version} by ${package.author}`)


if(config.https == "true"){
    if(![443,2053,2083,2087,2096,8443].includes(config.port)){
        console.error(`HTTPS can only be used with ports 443,2053,2083,2087,2096 and 8443!\nChange your port in the config.json.\nThe port is currently ${config.port}`)
        throw {unsupportedHTTPSport: config.port};
    }


    
    console.log("Supported HTTPS configuration. Proceeding...")

    try{
        var options = {
            key: fs.readFileSync('./privatekey.pem'),
            cert: fs.readFileSync('./certificate.pem'),
        }
    }

    catch(error){
        console.error('Error loading certificates!\n')
        console.error(error)
    }

    var server = https.createServer(options, app).listen(config.port, function(){
        console.log("Started! on port" + config.port);
      });
}
else {

    if(![80,8080,8880,2052,2082,2086,2095].includes(config.port)){
        console.error(`HTTP can only be used with ports 80,8080,8880,2052,2082,2086 and 2095!\nChange your port in the config.json.\nThe port is currently ${config.port}`)
        throw {unsupportedHTTPport: config.port};
    }
    console.log("Supported HTTP configuration. Proceeding...")

    app.listen(config.port)
}

app.put('/sign', async (req,res) => {
    try{
        mpserver.sign(req,res).catch(error => console.error)
    }
    catch(error){
        console.error(error)
    }
})

app.get('/verify', async (req,res) => {
    try{
        mpserver.verify(req,res).catch(error => console.error)
    }
    catch(error){
        console.error(error)
    }
})


app.get('/', async (req,res) => {
    res.status = 200
    res.send(`MPTKT${package.version}++${config.enrollment}`)
})

console.groupEnd()
console.log('Started!')

