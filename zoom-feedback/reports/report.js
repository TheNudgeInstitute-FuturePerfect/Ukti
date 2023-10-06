"use strict";

const express = require("express");
const app = express.Router();
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
const students = require("../models/students.js")

app.get("/feedbackstatus", async (request, response) => {
    const executionID = Math.random().toString(36).slice(2)

    //Prepare text to prepend with logs
    const params = ["reports",request.method,request.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
        
    const currentDtStart = request.query['startDate'] ? request.query['startDate'] : (new Date("1970-01-01 00:00:00"))
    const currentDtEnd = request.query['endDate'] ? request.query['endDate'] : (new Date())
    
    const filter = {
        'Sessions.Date':{
            "$gte": currentDtStart,
            "$lte": currentDtEnd
        }
    }
    students
    //.find(filter)
    //.select('FPIID Mobile Sessions._id Sessions.Date Sessions.DayOfProgression Sessions.Feedback.MsgSent Sessions.Feedback.TimeStamp')
    .aggregate([
        {
          '$match': {
            'Sessions.Date': {
                "$gte": currentDtStart,
                "$lte": currentDtEnd
            }
          }
        }, {
          '$unwind': {
            'path': '$Sessions', 
            'preserveNullAndEmptyArrays': true
          }
        }, {
          '$match': {
            'Sessions.Date': {
                "$gte": currentDtStart,
                "$lte": currentDtEnd
            }
          }
        }, {
          '$addFields': {
            'PromptOutput': '$Sessions.PromptOutput'
          }
        }, {
          '$set': {
            'TranscriptObject': {
              '$arrayElemAt': [
                '$PromptOutput', 0
              ]
            }, 
            'CorrectSentenceObject': {
              '$arrayElemAt': [
                '$PromptOutput', 1
              ]
            }, 
            'IncorrectSentenceObject': {
              '$arrayElemAt': [
                '$PromptOutput', 2
              ]
            }
          }
        }, {
          '$set': {
            'SessionID': '$Sessions._id', 
            'SessionDate': '$Sessions.Date', 
            'AudioFileS3URI': '$Sessions.AudioFileS3URI', 
            'DayOfProgression': '$Sessions.DayOfProgression', 
            'Transcript': '$TranscriptObject.ChatGPTReply', 
            'CorrectSentencePromptReply': '$CorrectSentenceObject.ChatGPTReply', 
            'IncorrectSentencePromptReply': '$IncorrectSentenceObject.ChatGPTReply', 
            'FeedbackID': '$Sessions.Feedback._id', 
            'FeedbackMessageSent': '$Sessions.Feedback.MsgSent', 
            'FeedbackMessageTimeStamp': '$Sessions.Feedback.TimeStamp'
          }
        }, {
          '$unset': [
            'Name', 'GlificID', '_id', 'Consent', 'createdAt', '__v', 'updatedAt', 'Sessions', 'PromptOutput', 'TranscriptObject', 'CorrectSentenceObject', 'IncorrectSentenceObject'
          ]
        }
    ]) 
    .then((user)=>{
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",user)
        response.status(200).json(user)
    })
    .catch((error)=>{
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
        console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
        response.status(500).send(error)
    })
    
});

app.get("/feedbackinteractions", async (request, response) => {
    const executionID = Math.random().toString(36).slice(2)

    //Prepare text to prepend with logs
    const params = ["reports",request.method,request.url,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
        
    const currentDtStart = request.query['startDate'] ? request.query['startDate'] : (new Date("1970-01-01 00:00:00"))
    const currentDtEnd = request.query['endDate'] ? request.query['endDate'] : (new Date())
    
    const filter = {
        'Sessions.Date':{
            "$gte": currentDtStart,
            "$lte": currentDtEnd
        }
    }
    students
    //.find(filter)
    //.select('FPIID Mobile Sessions._id Sessions.Date Sessions.DayOfProgression Sessions.Feedback.MsgSent Sessions.Feedback.TimeStamp')
    .aggregate([
        {
          '$match': {
            'Sessions.Date': {
                "$gte": currentDtStart,
                "$lte": currentDtEnd
            }
          }
        }, {
          '$unwind': {
            'path': '$Sessions', 
            'preserveNullAndEmptyArrays': true
          }
        }, {
          '$match': {
            'Sessions.Date': {
                "$gte": currentDtStart,
                "$lte": currentDtEnd
            }
          }
        }, {
          '$addFields': {
            'FeedbackInteractions': '$Sessions.Feedback.Interactions'
          }
        }, {
          '$unwind': {
            'path': '$FeedbackInteractions', 
            'preserveNullAndEmptyArrays': true
          }
        }, {
          '$set': {
            'SessionID': '$Sessions._id', 
            'SessionDate': '$Sessions.Date', 
            'FeedbackID': '$Sessions.Feedback._id', 
            'BotMessage': '$FeedbackInteractions.Bot', 
            'StudentResponse': '$FeedbackInteractions.User', 
            'TimeStamp': '$FeedbackInteractions.TimeStamp'
          }
        }, {
          '$unset': [
            'Name', 'GlificID', '_id', 'Consent', 'createdAt', '__v', 'updatedAt', 'Sessions', 'FeedbackInteractions'
          ]
        }
      ]) 
    .then((user)=>{
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",user)
        response.status(200).json(user)
    })
    .catch((error)=>{
        console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
        console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
        response.status(500).send(error)
    })
    
});

module.exports = app;
