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
        try{
            let decoded = jwt.verify(req.params.token, this.sign_publickey)
            if(this.revocations.findOne({_id : decoded._id})){
                let revdoc = await this.revocations.findOne(decoded._id)
                if(revdoc.type == "full"){
                    throw "TICKET REVOKED"
                }
            }

            res.status(200)
            res.send("Valid")
        }

        catch(error){
            console.error(error)
            res.status(401)
            let responseStr = "Unable to authenticate"
            if(error == "TICKET REVOKED"){
                responseStr = error
            }
            

            res.send(responseStr)
            return
        }
    }
}
module.exports = Server