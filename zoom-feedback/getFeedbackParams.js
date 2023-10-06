"use strict";

const express = require("express");
const app = express.Router();
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
const students = require("./models/students.js")
const sendResponseToGlific = require("../glific/sendResponseToGlific.js")

app.get("/:glificID", async (request, response) => {
    let startTimeStamp = new Date()
    const executionID = Math.random().toString(36).slice(2)

    //Prepare text to prepend with logs
    const params = ["getFeedbackParams",request.method,request.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
        
    
    if(typeof request.params["glificID"] === 'undefined')
        throw new Error('Missing parameter: glificID')
    else{
        const currentDate = new Date()
        const currentDtStart = new Date(currentDate.getFullYear(),currentDate.getMonth(),currentDate.getDate(),0,0,0)
        const currentDtEnd = new Date(currentDate.getFullYear(),currentDate.getMonth(),currentDate.getDate(),23,59,59)

        const filter = {
            "GlificID": request.params["glificID"],
            //'Sessions.Date':{
              //  "$gte": currentDtStart,
                //"$lte": currentDtEnd
            //}
        }
        students.find(filter).sort({_id:-1})
        .then(async (user)=>{
            let responseJSON =  {
                OperationStatus : 'SUCCESS'
            }
            if(user==null){
                responseJSON['OperationStatus'] = "NO_USR"
                responseJSON['StatusDescription'] = "No Such User"
            }
            else if(user.length==0){
                responseJSON['OperationStatus'] = "NO_USR"
                responseJSON['StatusDescription'] = "No Such User"
            }
            else{
                //Filter the session data
                const todaysSession = user[0]['Sessions'].filter(session=>(session.Date>=currentDtStart)&&(session.Date<=currentDtEnd))
                if(todaysSession.length==0){
                    responseJSON['OperationStatus'] = "NO_SSN_DATA"
                    responseJSON['StatusDescription'] = "No Session Data for Today"
                }
                else{
                    responseJSON['SessionID'] = todaysSession[0]['id']
                    responseJSON['DayOfProgression'] = todaysSession[0]['DayOfProgression']
                    let promptOutput = todaysSession[0]['PromptOutput'].filter(data=>data.Prompt == 'Transcribe')
                    responseJSON['Transcript'] = promptOutput[0]['ChatGPTReply']
                    responseJSON['CorrectSentence'] = ''
                    let promptOutputTokens = null
                    promptOutput = todaysSession[0]['PromptOutput'].filter(data=>data.Prompt == 'Correct Sentence')
                    if(promptOutput.length>0){
                        promptOutputTokens = promptOutput[0]['ChatGPTReply'].split("\n")
                        promptOutputTokens = promptOutputTokens.filter(line=>line.length>0)
                        for(var i=1; i<promptOutputTokens.length; i++){
                            if(promptOutputTokens[i-1]=='Grammatically Correct Sentences:'){
                                if(promptOutputTokens[i]!='Not enough material to give feedback')
                                    responseJSON['CorrectSentence'] = promptOutputTokens[i]
                                break
                            }
                        }
                    }
                    responseJSON['CorrectSentencePresent'] = responseJSON['CorrectSentence'] != ''
                    responseJSON['IncorrectSentence'] = ''
                    responseJSON['CorrectedSentence'] = ''
                    responseJSON['ErrorExplanations'] = ''
                    promptOutput = todaysSession[0]['PromptOutput'].filter(data=>data.Prompt == 'Incorrect Sentence')
                    if(promptOutput.length>0){
                        promptOutputTokens = promptOutput[0]['ChatGPTReply'].split("\n")
                        promptOutputTokens = promptOutputTokens.filter(line=>line.length>0)
                        for(var i=1; i<promptOutputTokens.length; i++){
                            if(promptOutputTokens[i-1]=='Identified Incorrect Sentences:'){
                                if(!['None','N/A'].includes(promptOutputTokens[i]))
                                    responseJSON['IncorrectSentence'] = promptOutputTokens[i]
                            }
                            else if(promptOutputTokens[i-1]=='Corrected Sentences:'){
                                if(!['None','N/A'].includes(promptOutputTokens[i]))
                                    responseJSON['CorrectedSentence'] = promptOutputTokens[i]
                            }
                            else if(promptOutputTokens[i-1]=='Error Explanations:'){
                                if(!['None','N/A'].includes(promptOutputTokens[i]))
                                    responseJSON['ErrorExplanations'] = promptOutputTokens[i]
                                break
                            }
                        }
                    }
                    responseJSON['IncorrectSentencePresent'] = responseJSON['IncorrectSentence'] != ''
                    responseJSON['CorrectedSentencePresent'] = responseJSON['CorrectedSentence'] != ''
                    responseJSON['ErrorExplanationsPresent'] = responseJSON['ErrorExplanations'] != '' 
                }                    
            }
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseJSON)
            await sendResponseToGlific(request.body['FlowID'],request.params["glificID"],responseJSON,"getparams",response,startTimeStamp,executionID)
        })
        .catch((error)=>{
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
            console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
            response.status(500).send(error)
        })
    }
});

app.get("/:glificID/:sessionDate", async (request, response) => {
    let startTimeStamp = new Date()
    const executionID = Math.random().toString(36).slice(2)

    //Prepare text to prepend with logs
    const params = ["getFeedbackParams",request.method,request.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
        
    
    if(typeof request.params["glificID"] === 'undefined')
        throw new Error('Missing parameter: glificID')
    else if(typeof request.params["sessionDate"] === 'undefined')
        throw new Error('Missing parameter: sessionDate')
    else{
        const currentDate = new Date(request.params["sessionDate"])
        const currentDtStart = new Date(currentDate.getFullYear(),currentDate.getMonth(),currentDate.getDate(),0,0,0)
        const currentDtEnd = new Date(currentDate.getFullYear(),currentDate.getMonth(),currentDate.getDate(),23,59,59)

        const filter = {
            "GlificID": request.params["glificID"],
            //'Sessions.Date':{
              //  "$gte": currentDtStart,
                //"$lte": currentDtEnd
            //}
        }
        students.find(filter).sort({_id:-1})
        .then(async (user)=>{
            let responseJSON =  {
                OperationStatus : 'SUCCESS'
            }
            if(user==null){
                responseJSON['OperationStatus'] = "NO_USR"
                responseJSON['StatusDescription'] = "No Such User"
            }
            else if(user.length==0){
                responseJSON['OperationStatus'] = "NO_USR"
                responseJSON['StatusDescription'] = "No Such User"
            }
            else{
                //Filter the session data
                const todaysSession = user[0]['Sessions'].filter(session=>(session.Date>=currentDtStart)&&(session.Date<=currentDtEnd))
                if(todaysSession.length==0){
                    responseJSON['OperationStatus'] = "NO_SSN_DATA"
                    responseJSON['StatusDescription'] = "No Session Data for Today"
                }
                else{
                    responseJSON['SessionID'] = todaysSession[0]['id']
                    responseJSON['DayOfProgression'] = todaysSession[0]['DayOfProgression']
                    let promptOutput = todaysSession[0]['PromptOutput'].filter(data=>data.Prompt == 'Transcribe')
                    responseJSON['Transcript'] = promptOutput[0]['ChatGPTReply']
                    responseJSON['CorrectSentence'] = ''
                    let promptOutputTokens = null
                    promptOutput = todaysSession[0]['PromptOutput'].filter(data=>data.Prompt == 'Correct Sentence')
                    if(promptOutput.length>0){
                        promptOutputTokens = promptOutput[0]['ChatGPTReply'].split("\n")
                        promptOutputTokens = promptOutputTokens.filter(line=>line.length>0)
                        for(var i=1; i<promptOutputTokens.length; i++){
                            if(promptOutputTokens[i-1]=='Grammatically Correct Sentences:'){
                                if(promptOutputTokens[i]!='Not enough material to give feedback')
                                    responseJSON['CorrectSentence'] = promptOutputTokens[i]
                                break
                            }
                        }
                    }
                    responseJSON['CorrectSentencePresent'] = responseJSON['CorrectSentence'] != ''
                    responseJSON['IncorrectSentence'] = ''
                    responseJSON['CorrectedSentence'] = ''
                    responseJSON['ErrorExplanations'] = ''
                    promptOutput = todaysSession[0]['PromptOutput'].filter(data=>data.Prompt == 'Incorrect Sentence')
                    if(promptOutput.length>0){
                        promptOutputTokens = promptOutput[0]['ChatGPTReply'].split("\n")
                        promptOutputTokens = promptOutputTokens.filter(line=>line.length>0)
                        for(var i=1; i<promptOutputTokens.length; i++){
                            if(promptOutputTokens[i-1]=='Identified Incorrect Sentences:'){
                                if(!['None','N/A'].includes(promptOutputTokens[i]))
                                    responseJSON['IncorrectSentence'] = promptOutputTokens[i]
                            }
                            else if(promptOutputTokens[i-1]=='Corrected Sentences:'){
                                if(!['None','N/A'].includes(promptOutputTokens[i]))
                                    responseJSON['CorrectedSentence'] = promptOutputTokens[i]
                            }
                            else if(promptOutputTokens[i-1]=='Error Explanations:'){
                                if(!['None','N/A'].includes(promptOutputTokens[i]))
                                    responseJSON['ErrorExplanations'] = promptOutputTokens[i]
                                break
                            }
                        }
                    }
                    responseJSON['IncorrectSentencePresent'] = responseJSON['IncorrectSentence'] != ''
                    responseJSON['CorrectedSentencePresent'] = responseJSON['CorrectedSentence'] != ''
                    responseJSON['ErrorExplanationsPresent'] = responseJSON['ErrorExplanations'] != '' 
                }                    
            }
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseJSON)
            await sendResponseToGlific(request.body['FlowID'],request.params["glificID"],responseJSON,"getparamsondate",response,startTimeStamp,executionID)
        })
        .catch((error)=>{
            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
            console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
            response.status(500).send(error)
        })
    }
});

module.exports = app;
