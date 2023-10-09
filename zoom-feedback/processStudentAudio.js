"use strict";

const express = require("express");
const app = express.Router();
var bodyParser = require("body-parser");
var prependToLog = null
var executionID
app.use(bodyParser.urlencoded({ extended: false }));
const students = require("./models/students.js")
const systemPrompt = require("./models/systemPrompts.js")
const applicationConfig = require("./models/applicationConfigs.js")
const applicationError = require("./models/applicationErrors.js")
// Import the required AWS SDK clients and commands for Node.js
const s3 = require("@aws-sdk/client-s3")
const _retry = require("async-retry");
const OpenAI = require("openai");
const fs = require("fs");
const { isNull } = require("util");
const createContactInGlific = require("../glific/createContactInGlific.js")


app.post("/", async (request, response) => {
    executionID = Math.random().toString(36).slice(2)
      
    //Prepare text to prepend with logs
    const params = ["processStudentAudio",request.method,executionID,""]
    prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")

    response.status(200).json({OperationStatus:"Request Received"})

    console.info((new Date()).toString()+"|"+prependToLog,"Sent Response")

    const requestBody = request.body

    /*Get the Audio S3 URI from the S3 event JSON
    {
        "Records": [
            {
            "eventVersion": "2.1",
            "eventSource": "aws:s3",
            "awsRegion": "ap-south-1",
            "eventTime": "2023-10-06T10:34:50.124Z",
            "eventName": "ObjectCreated:Put",
            "userIdentity": { "principalId": "AMUNJNXE99K1V" },
            "requestParameters": { "sourceIPAddress": "47.31.99.255" },
            "responseElements": {
                "x-amz-request-id": "GGKHG3E9BWDQ492M",
                "x-amz-id-2": "i7M+2MfBF3/o/+YGBsUQdK2W5NTLD5mMGVmC7uBvLsgVmZVTw/EaimOjdzu1OEm8uZK0pCjJMVgughxd939Ig5JZJJCSHOYR"
            },
            "s3": {
                "s3SchemaVersion": "1.0",
                "configurationId": "ukti-uat",
                "bucket": {
                    "name": "fp-zoom-bots-uat",
                    "ownerIdentity": { "principalId": "AMUNJNXE99K1V" },
                    "arn": "arn:aws:s3:::fp-zoom-bots-uat"
                },
                "object": {
                    "key": "participants/FP1-9990502220-Aashutosh-6-202310154140.m4a",
                    "size": 1704185,
                    "eTag": "0f3f00e249d885c92b9ee8c9b2e2f255",
                    "sequencer": "00651FE2CA01CAD58F"
                }
            }
            }
        ]
    }
    */
    requestBody['Records'].forEach(async(record)=>{
        try{
            console.info((new Date()).toString()+"|"+prependToLog,"Process Event Data")
            //Tokeninze the filename <Student FPID> - <students mobile> - <students name> - <FP Batch's Day of Progression> - <session timestamp(YYYYMMDD HH:MM:SS)>.<file extension>
            let fileFullName = record["s3"]["object"]["key"]
            const fileNameParts = fileFullName.split(".")
            const fileExtension = fileNameParts.length == 0 ? null : fileNameParts[fileNameParts.length-1]
            const fileName = fileNameParts.length == 0 ? fileNameParts[0] : fileNameParts.filter((data,index)=>index <= (fileNameParts.length-2)).join(".")
            let fileNameTokens = fileName.split("-")
            //Trim each token to remove whitespaces
            fileNameTokens = fileNameTokens.map(token=>token.trim())

            //If file name is not in format, throw error and exit
            if(fileNameTokens.length != 5)
                throw new Error("File name is not in desired format")
            else{
                console.info((new Date()).toString()+"|"+prependToLog,"Prepare S3 Bucket Request")
                // Create an Amazon S3 client object.
                const s3Client = new s3.S3Client({ 
                    region: record["awsRegion"],
                    credentials:{
                        accessKeyId:process.env.FP_AWS_ACCESS_KEY_ID,
                        secretAccessKey:process.env.FP_AWS_SECRET_ACCESS_KEY
                    } 
                });
                
                //Create transcription param object
                const params = {
                    Bucket: record["s3"]["bucket"]["name"],
                    Key: fileFullName
                };
                console.debug((new Date()).toString()+"|"+prependToLog,"Get S3 Object Params:"+JSON.stringify(params))

                console.info((new Date()).toString()+"|"+prependToLog,"Get Audio File from S3 Bucket")
                
                // Get the name of the object from the Amazon S3 bucket. Retry in case of error
                const retryOptions = {
                    retries: parseInt(process.env.MaxAttempts),
                    minTimeout: 1000,
                    maxTimeout: 60000,
                    randomize: true,
                };

                const getObjectCommandResponse = await _retry(async () => {
                    return await s3Client.send(new s3.GetObjectCommand(params));
                }, retryOptions);

                fileFullName = fileFullName.startsWith("participants/") ? fileFullName.replace("participants/"):fileFullName
                // Extract the body contents a temp file
                console.info((new Date()).toString()+"|"+prependToLog,"Store S3 Object to temp file: ./tmp/"+fileFullName)

                const tempFile = './tmp/'+fileFullName
                var tempFileWriteStream = fs.createWriteStream(tempFile, {flags: 'w'})
                getObjectCommandResponse.Body.pipe(tempFileWriteStream)
                
                let sessionData = {
                    Date              :(new Date(fileNameTokens[4].slice(0,4),fileNameTokens[4].slice(4,6)-1,fileNameTokens[4].slice(6,8),fileNameTokens[4].slice(8,10),fileNameTokens[4].slice(10,12),fileNameTokens[4].slice(12,14))),//<session timestamp(YYYYMMDDHHMMSS)>
                    DayOfProgression  :parseInt(fileNameTokens[3]), //<FP Batch's Day of Progression>
                    AudioFileS3URI    :"s3://"+record["s3"]["bucket"]["name"]+"/"+record["s3"]["object"]["key"],
                    PromptOutput      :[],
                    Feedback          :null
                }

                //Search Student Records by Student's FPID. Get the records in descending order or creation. The Latest record will be of interest
                let studentsAllRecords = await students.find({FPID:fileNameTokens[0]}).sort({"id":-1})
                
                //If no record found
                if(studentsAllRecords.length==0){
                    console.info((new Date()).toString()+"|"+prependToLog,"Student Record not found; Creating contact in Glific");
                    //Create a new record in Glific and Optin in GupShup via Glific API (assumption here is that FP Batch Student has already provided a consent to allow whatsapp communication at the time of enrolment)
                    const glificID = await createContactInGlific(fileNameTokens[0],fileNameTokens[2],fileNameTokens[1])
                    console.info((new Date()).toString()+"|"+prependToLog,"Contact's Glific ID: "+glificID+". Creating new student record");
                    
                    //Create a record for new students and Store students's Glific ID
                    studentsAllRecords = await students.create({
                        FPID:fileNameTokens[0],//<students FPID>
                        Mobile:fileNameTokens[1],//<students mobile>
                        Name:fileNameTokens[2],//<students name>
                        Consent:true,
                        GlificID:glificID,
                        Sessions:[]
                    })

                    console.info((new Date()).toString()+"|"+prependToLog,"Student Record Created: "+studentsAllRecords["id"]);
                }
                
                //Get Student Record
                let studentRecord = Array.isArray(studentsAllRecords) ? studentsAllRecords[0] : studentsAllRecords
                //Push Session Data in Student Record
                studentRecord['Sessions'].push(sessionData)
                
                console.info((new Date()).toString()+"|"+prependToLog,"Get Application Configuration")
                
                const config = await applicationConfig.find({
                    AppName:"ZoomFeedback"
                });

                if(config.length==0)
                    throw new Error("No Application Configuration found")
                else{
                    
                    console.info((new Date()).toString()+"|"+prependToLog,"Get System Prompt Execution Order")
                    
                    if(config[0]['Config']['PromptExecutionOrder']==='undefined')
                        throw new Error("No configuration for PromptExecutionOrder")
                    else if(config[0]['Config']['PromptExecutionOrder']==null){
                        throw new Error("PromptExecutionOrder is null")
                    }
                    else{
                    
                        console.info((new Date()).toString()+"|"+prependToLog,"Get System Prompt Configuration")
                    
                        //Get System Prompt Configuration
                        const systemPromptConfiguration =  await systemPrompt.find({
                            Name:{
                                $in:config[0]['Config']['PromptExecutionOrder']
                            },
                            IsActive:true
                        })

                        if(systemPromptConfiguration.length==0)
                            throw new Error("No Active System Prompt found")
                        else{

                            console.info((new Date()).toString()+"|"+prependToLog,"Initialize ChatGPT Object")

                            const openai = new OpenAI({
                                apiKey: process.env.OpenAIKey
                            });
                
                            async function completionWithBackoff(model, temperature, messages) {
                                return await openai.chat.completions.create({
                                model: model,
                                temperature,
                                messages,
                                });
                            }
                        
                            console.info((new Date()).toString()+"|"+prependToLog,"Execute System Prompts Configuration")
                
                            for(let eachPrompt of config[0]['Config']['PromptExecutionOrder']){
                                //Filter the configuration for the system prompt
                                const promptConfiguration = systemPromptConfiguration.filter(data=>data.Name == eachPrompt)
                                //If there is no configuration, skip eecution
                                if(promptConfiguration.length==0)
                                    continue
                                if(eachPrompt == 'Transcribe'){
                                    // Send request to ChatGPT
                                    console.info((new Date()).toString()+"|"+prependToLog,"Request Sent to ChatGPT for "+eachPrompt)
                                    const chatGPTResponse = await _retry(async () => {
                                        return await openai.audio.transcriptions.create({
                                            model: promptConfiguration[0]["Model"],
                                            file: fs.createReadStream(tempFile),
                                            //prompt:promptConfiguration[0]["Content"],
                                            temperature:promptConfiguration[0]["Temperature"]
                                        });
                                    }, retryOptions);
                                    // Read ChatGPT's Response
                                    const reply = chatGPTResponse.text;
                                    console.debug((new Date()).toString()+"|"+prependToLog,"Reply received from Chat GPT: " + JSON.stringify(chatGPTResponse));
                                    sessionData['PromptOutput'].push({
                                        Prompt : eachPrompt, 
                                        ChatGPTReply : reply
                                    })
                                }
                                else{
                                    //Transcription
                                    const transcription = sessionData['PromptOutput'].filter(data=>data.Prompt=='Transcribe')
                                    //Prepare payload
                                    const payload = [
                                        {
                                            role:'system',
                                            content: promptConfiguration[0]['Content']
                                        },
                                        {
                                            role:'user',
                                            content:transcription[0]['ChatGPTReply']
                                        }
                                    ]
                                    // Send request to ChatGPT
                                    console.info((new Date()).toString()+"|"+prependToLog,"Request Sent to ChatGPT for "+eachPrompt)
                                    const chatGPTResponse = await _retry(async () => {
                                        return await completionWithBackoff(
                                            promptConfiguration[0]["Model"],
                                            parseFloat(promptConfiguration[0]["Temperature"]),
                                            payload
                                        );
                                    }, retryOptions);
                    
                                    // Read ChatGPT's Response
                                    const reply = chatGPTResponse.choices[0].message.content;
                                    console.debug((new Date()).toString()+"|"+prependToLog,"Reply received from Chat GPT: " + reply);
                                    let completionTokens = null
                                    let promptTokens = null
                                    if(typeof chatGPTResponse['usage'] !== 'undefined'){
                                        completionTokens = (typeof chatGPTResponse['usage']['completion_tokens'] !== 'undefined') ? chatGPTResponse['usage']['completion_tokens'] : 0
                                        promptTokens = (typeof chatGPTResponse['usage']['prompt_tokens'] !== 'undefined') ? chatGPTResponse['usage']['prompt_tokens'] : 0
                                    }
                                    sessionData['PromptOutput'].push({
                                        Prompt : eachPrompt, 
                                        ChatGPTReply : reply,
                                        CompletionTokens : completionTokens,
                                        PromptTokens : promptTokens
                                    })
                                }
                            }

                            //Replace Session Data pushhed in Student Record with updated Session data
                            studentRecord['Sessions'].pop()
                            studentRecord['Sessions'].push(sessionData)

                            //Update Student Reocrd
                            const updateStudentRecord = await students.findByIdAndUpdate(studentRecord["id"],studentRecord)
                            console.info((new Date()).toString()+"|"+prependToLog,"Student Record Updated: "+studentRecord["id"]+'. Deleting temp audio file: ./tmp/'+fileFullName);
                            fs.unlinkSync(tempFile)
                            console.info((new Date()).toString()+"|"+prependToLog,"End of Execution");
                        }
                    }
                }
            }
        }
        catch(error){
            console.info((new Date()).toString()+"|"+prependToLog,"Error in Execution")
            console.error((new Date()).toString()+"|"+prependToLog,"Error in Execution:",error)
            applicationError.create({
                Module: "processStudentAudio",
                StackTrace:error,
                Payload:JSON.stringify(request.body)
            }).then(()=>{})
        }
    })
});

module.exports = app;
  

