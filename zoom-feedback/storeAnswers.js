"use strict";

const express = require("express");
const app = express.Router();
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
const students = require("./models/students.js")
const sendResponseToGlific = require("../glific/sendResponseToGlific.js")


app.patch("/interaction/:glificID", async (request, response) => {
    let startTimeStamp = new Date()
    const executionID = Math.random().toString(36).slice(2)

    //Prepare text to prepend with logs
    const params = ["storeAnswers",request.method,request.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
        
    
    if(typeof request.params["glificID"] === 'undefined')
        throw new Error('Missing parameter: glificID')
    else if(typeof request.body["Question"] === 'undefined')
        throw new Error('Missing parameter: Question')
    else if(typeof request.body["Answer"] === 'undefined')
        throw new Error('Missing parameter: Answer')
    else if(typeof request.body["SessionID"] === 'undefined')
        throw new Error('Missing parameter: SessionID')
    else{
        const filter = {
            "GlificID": request.params["glificID"],
            'Sessions._id':request.body["SessionID"]
        }
        students.updateOne(
            filter,
            {
                $push:{
                    "Sessions.$[t].Feedback.Interactions":{
                        Bot         :request.body["Question"],
                        User        :request.body["Answer"],
                        TimeStamp   :(new Date()),
                    }
                }
            },
            {
                arrayFilters:[
                    {
                        "t._id":request.body["SessionID"]
                    }
                ]
            },
            {new:true}
        )
        .then(async (user)=>{
            let responseJSON =  {
                OperationStatus : 'SUCCESS'
            }
            if(user.matchedCount==0){
                responseJSON['OperationStatus'] = "NO_USR_RCRD"
                responseJSON['StatusDescription'] = "No Such User Record"
            }
            else if(user.modifiedCount==0){
                responseJSON['OperationStatus'] = "NO_RCRD_UPDTD"
                responseJSON['StatusDescription'] = "Could not Update Record"
            }
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseJSON)
            await sendResponseToGlific(request.body['FlowID'],request.params["glificID"],responseJSON,"storedanswer",response,startTimeStamp,executionID)
        })
        .catch((error)=>{
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
            console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
            response.status(500).send(error)
        })
    }
});

app.post("/interaction/:glificID", async (request, response) => {
    let startTimeStamp = new Date()
    const executionID = Math.random().toString(36).slice(2)

    //Prepare text to prepend with logs
    const params = ["storeAnswers",request.method,request.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
        
    
    if(typeof request.params["glificID"] === 'undefined')
        throw new Error('Missing parameter: glificID')
    else if(typeof request.body["Question"] === 'undefined')
        throw new Error('Missing parameter: Question')
    else if(typeof request.body["Answer"] === 'undefined')
        throw new Error('Missing parameter: Answer')
    else if(typeof request.body["SessionID"] === 'undefined')
        throw new Error('Missing parameter: SessionID')
    else{
        const filter = {
            "GlificID": request.params["glificID"],
            'Sessions._id':request.body["SessionID"]
        }
        students.updateOne(
            filter,
            {
                $push:{
                    "Sessions.$[t].Feedback.Interactions":{
                        Bot         :request.body["Question"],
                        User        :request.body["Answer"],
                        TimeStamp   :(new Date()),
                    }
                }
            },
            {
                arrayFilters:[
                    {
                        "t._id":request.body["SessionID"]
                    }
                ]
            },
            {new:true}
        )
        .then(async (user)=>{
            let responseJSON =  {
                OperationStatus : 'SUCCESS'
            }
            if(user.matchedCount==0){
                responseJSON['OperationStatus'] = "NO_USR_RCRD"
                responseJSON['StatusDescription'] = "No Such User Record"
            }
            else if(user.modifiedCount==0){
                responseJSON['OperationStatus'] = "NO_RCRD_UPDTD"
                responseJSON['StatusDescription'] = "Could not Update Record"
            }
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseJSON)
            await sendResponseToGlific(request.body['FlowID'],request.params["glificID"],responseJSON,"storedanswer",response,startTimeStamp,executionID)
        })
        .catch((error)=>{
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
            console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
            response.status(500).send(error)
        })
    }
});

module.exports = app;
