const { text } = require('express');
const jwt = require('jsonwebtoken')
const { MongoClient, MongoServerError } = require('mongodb')
const { v4: uuidv4 } = require('uuid');

class Server{
    /**
     * 
     * @param {MongoClient} mongodbclient  
     */
    constructor(mongodbclient, config, pkg, privatekey, publickey, websitekey){
        this.websitekey = websitekey
        this.mongo = mongodbclient
        this.tickets = this.mongo.db(config.DBName).collection('tickets')
        this.revocations = this.mongo.db(config.DBName).collection('revocations')
        this.kiosks = this.mongo.db(config.DBName).collection('kiosks')
        this.alerts = this.mongo.db(config.DBName).collection('alerts')
        this.events = this.mongo.db(config.DBName).collection('events')
        this.sign_privatekey = privatekey
        this.sign_publickey = publickey
        this.config = config
        this.pkg = pkg
    }

    /**
     * @param {Express.Request} req 
     * @param {Express.Response} res 
     */

    sign = async (req,res) => {
        try{
            let decoded = jwt.verify(req.body.token, this.websitekey)
            
            if (decoded) {
                let uuid = uuidv4();
                try{
                    let data = {"_id" : uuid, name: decoded.name, type: decoded.type, phone: decoded.phone }
                    let token = jwt.sign(data, this.sign_privatekey, {algorithm: 'RS256'})
                    this.tickets.insertOne(data)
                    res.type('text')
                    res.status(201)
                    res.send(token)
                }
                catch(error){
                    console.error(error);
                    if (error instanceof MongoServerError) {
                        this.alerts.insertOne({"decoded" : decoded,"uuid" : uuid})
                      }
                    res.status(500)
                    res.send()
                }
            }
        }
        catch(error){
            console.error(error);
            res.type('text')
            res.status(401)
            res.send('Unable to authenticate')
        }
        
    }

    /**
     * @param {Express.Request} req 
     * @param {Express.Response} res 
     */

    verify = async (req,res) => {
        let checks = await this.verifytoken(req,res).catch(error => console.error)
        res.type('text')
        res.status(checks[0])
        res.send(checks[1])
    }



    verifytoken = async (req,res,query = true) => {
        try{
            let datsrc
            if(query){
                datsrc = req.query
            }
            else{
                datsrc = req.body
            }
            let decoded = jwt.verify(datsrc["token"], this.sign_publickey)
            let revdoc  = await this.revocations.findOne({_id : decoded._id})
            if(revdoc){
                //check for ticket invalidation
                if(revdoc.type.includes("!FULL!")){
                    throw "TICKET REVOKED! Reason: " + revdoc.reason
                }
            
            }

            //is there an event-specific query?
            if(req.query["event"]){
                let event = await this.events.findOne({_id : datsrc["event"]})
                if(event){
                    //event is valid

                    //check for event-specific revocation
                    if(revdoc){
                        if(revdoc.type.includes(datsrc["event"])){
                            return[403, "Barred from event! Reason: " + revdoc.reason];
                        }
                    }
                    
                    
                    //check if the pass is allowed to access that event
                    if(!event.typesAllowed.includes(decoded.type) && !event.typesAllowed.includes("!ALL!")){
                        return[403, `this ticket type cannot access ${event.name}`];
                    }

                    //check for second time attending
                    let ticket = await this.tickets.findOne({_id:  decoded._id})
                    if (ticket.eventsAttended){
                        if(ticket.eventsAttended.includes(datsrc["event"])){
                            return [403, "already attended"];
                        }
                    }
                }

                else{
                    return [404, "event not found"];
                }
            }


            // all checks passed

            return [200, "valid", decoded];
        }

        catch(error){
            console.error(error)
            let responseStr = "Unable to authenticate"
            if(typeof(error) == "string"){
                responseStr = error
            }
            return [401, responseStr]
        }
    }


    enroll = async (req,res) => {
        let code = req.body.code
        let name = req.body.name
        if(code && name){
            code = code.toLowerCase()
        }
        else{
            res.status(400)
            res.type('text')
            res.send("Malformed request")
            return;
        }
        let kiosk = await this.kiosks.findOne({enrollCode : { $eq : code}})

        if(kiosk){
            if(!kiosk.enrollDone){
                await this.kiosks.updateOne({_id : kiosk._id}, {
                    $set: {
                        "enrollDone" : true,
                        "assignment" : "",
                        "name" : name
                    }
                })
                res.status(200)
                res.type('text')
                let token = jwt.sign({_id:kiosk._id}, this.sign_privatekey, {algorithm: 'RS256'})
                res.send(token)
            }
            else{
                res.status(409)
                res.type('text')
                res.send('Kiosk registration not available')
            }

        }
        else{
            res.status(404)
            res.send("Instance not found")
        }
    }

    mark = async (req,res) => {
        let event = req.body.event
        let kiosktoken = req.body.kioskToken
        if(!event || !kiosktoken){
            res.status(400)
            res.type('text')
            res.send("Malformed request")
            return;
        }
        let tokenStatus = await this.verifytoken(req, res, false)
        
        if(tokenStatus[0] != 200){
            res.status(tokenStatus[0])
            res.type('text')
            res.send(tokenStatus[1])
            return;
        }
        let decoded = tokenStatus[2]
        //ticket is valid and can attend event!

        //check if kiosk has authority
        try{
            let kioskdecoded = jwt.verify(kiosktoken, this.sign_publickey)
            try{
                //make sure kiosk still exists in pool
                let kiosk = await this.kiosks.findOne({_id:kioskdecoded._id})
                if(!kiosk){
                    throw error
                }
                //make sure it is assigned to the event
                if(!kiosk.assignment.includes(event) && !kiosk.assignment.includes('!ALL!')){
                    throw error
                }
                //all checks met! lets add attendance!
                let ticket = await this.tickets.findOne({_id: decoded._id})
                
                //redundant check
                if(!ticket){
                    res.set(404)
                    res.send("Failed to query ticket")
                    return
                }

                let newattendance = ticket.eventsAttended || ""
                newattendance = newattendance + "," + event

                await this.tickets.updateOne({_id : ticket._id}, {$set:{eventsAttended : newattendance}})

                res.status(200)
                res.type('text')
                res.send('Updated attendance')
                return

            }
            catch(error){
                console.error(error)
                res.status(409)
                res.type('text')
                res.send("Misconfigured endpoint")
                return
            }

        }
        catch(error){
            res.status(401)
            res.type('text')
            res.send("Unable to authenticate")
            return;
        }
        


    }

    assignment = async (req,res) => {
        let kiosktoken = req.query.kioskToken
        if(!kiosktoken){
            res.status(400)
            res.type('text')
            res.send('Malformed request')
        }
        try {
            let decoded = jwt.verify(kiosktoken, this.sign_publickey)
            let kiosk = await this.kiosks.findOne({_id : decoded._id})
            if(!kiosk){
                throw "404"
            }

            if(!kiosk.enrollDone){
                throw "409"
            }

            if(kiosk.assignment == ""){
                res.status(204)
                res.type('text')
                res.send("No assignment")
                return
            }

            res.status(200)
            res.type('text')
            res.send(kiosk.assignment)
        }

        catch(error){
            if(error == "404"){
                res.status = 404
                res.send("Entry not found")
                return
            }

            if(error == "409"){
                res.status = 404
                res.send("Misconfigured endpoint")
                return
            }

            res.status(401)
            res.send("Unable to authenticate")
        }
    }


}
module.exports = Server