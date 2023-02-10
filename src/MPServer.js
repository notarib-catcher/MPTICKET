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
        res.status(checks[0])
        res.send(checks[1])
    }



    verifytoken = async (req,res) => {
        try{
            let decoded = jwt.verify(req.query["token"], this.sign_publickey)
            let revdoc  = await this.revocations.findOne({_id : decoded._id})
            if(revdoc){
                //check for ticket invalidation
                if(revdoc.type.includes("!FULL!")){
                    throw "TICKET REVOKED! Reason: " + revdoc.reason
                }
            
            }

            //is there an event-specific query?
            if(req.query["event"]){
                let event = await this.events.findOne({_id : req.query["event"]})
                if(event){
                    //event is valid

                    //check for event-specific revocation
                    if(revdoc){
                        if(revdoc.type.includes(req.query["event"])){
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
                        if(ticket.eventsAttended.includes(req.query["event"])){
                            return [403, "already attended"];
                        }
                    }
                }

                else{
                    return [404, "event not found"];
                }
            }


            // all checks passed

            return [200, "valid"];
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


}
module.exports = Server