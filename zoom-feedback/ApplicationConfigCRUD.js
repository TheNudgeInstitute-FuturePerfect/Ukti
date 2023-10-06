"use strict";

const express = require("express");
const applicationConfig = require("./models/applicationConfigs.js")

const app = express.Router();

//Filter unique elements in an array
const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};

//Check key in object
const checkKey = (ki,obj) => {
  const tokens = ki == null ? [] : Array.isArray(ki) ? ki : ki.split(",")
  const missingTokens = []
  for(var i = 0; i < tokens.length; i++){
    if(typeof obj[tokens[i]] === 'undefined')
      missingTokens.push(tokens[i])
  }
  return missingTokens
}

app.post("/", (req, res) => {
    
    const requestBody = req.body;

    const executionID = Math.random().toString(36).slice(2)
 
    //Prepare text to prepend with logs
    const params = ["Application Config",req.method,executionID,""]
    const prependToLog = params.join(" | ")
    
    console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
    //Initialize Response Object
    var responseJSON = {
        "OperationStatus":"SUCCESS"
    }

    const validateRequest = checkKey(["AppName","Config"],requestBody)
    if(validateRequest.length > 0){
      responseJSON["OperationStatus"] = "REQ_ERR"
      responseJSON["StatusDescription"] = "Missing params: "+validateRequest
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseJSON)
      res.status(200).json(responseJSON)
    }
    else{
      applicationConfig.create(requestBody)
      .then((config)=>{
          responseJSON["ApplicationConfigID"] = config["id"]
          console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseJSON)
          res.status(200).json(responseJSON)
      })
      .catch((error)=>{
          console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",responseJSON)
          console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
          res.status(500).send(error)
      })
    }
});

app.get("/:AppName", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Application Config",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
  let filter = {}
  if(typeof req.params["AppName"] !== 'undefined'){
    filter["AppName"] = req.params["AppName"]
  }

  applicationConfig.find(filter)
  .then((config)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",config)
      res.status(200).json(config)
  })
  .catch((error)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
      console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
      res.status(500).send(error)
  })
});

app.patch("/:AppName", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Application Config",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  let filter = {}
  if(typeof req.params["AppName"] !== 'undefined'){
    filter["AppName"] = req.params["AppName"]
  }
  
  applicationConfig.findOneAndUpdate(filter,req.body, {new:true})
  .then((config)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",config)
      res.status(200).json(config)
  })
  .catch((error)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error")
      console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
      res.status(500).send(error)
  })
});

app.put("/:AppName", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Application Config",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  let filter = {}
  if(typeof req.params["AppName"] !== 'undefined'){
    filter["AppName"] = req.params["AppName"]
  }
  
  applicationConfig.findOneAndReplace(filter,req.body, {new:true})
  .then((config)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",config)
      res.status(200).json(config)
  })
  .catch((error)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution with Error.")
      console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
      res.status(500).send(error)
  })
});

app.delete("/:id", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Application Config",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  applicationConfig.findByIdAndDelete(req.params['id'])
  .then((config)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",config)
      res.status(200).json(config)
  })
  .catch((error)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution.")
      console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
      res.status(500).send(error)
  })
  
});

app.patch("/updateTTSSpeed/:Speed", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Application Config",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  let filter = {}
  if(typeof req.params["AppName"] === 'undefined'){
    filter["AppName"] = "TTSConfig"
  }
   
  applicationConfig.find(filter).sort({"id":-1})
  .then(async (config)=>{
      let latestConfig = config
      const provider = latestConfig[0]['Config']["Provider"]
      latestConfig[0]["Config"][provider]["audioConfig"]["speakingRate"]=req.params["Speed"]
      const updatedConfig = await applicationConfig.findByIdAndUpdate(latestConfig[0]["id"],latestConfig[0],{new:true})
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",updatedConfig)
      res.status(200).json(updatedConfig)
  })
  .catch((error)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution.")
      console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
      res.status(500).send(error)
  })
});

app.patch("/updateTTSProvider/:Provider", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Application Config",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  let filter = {}
  if(typeof req.params["AppName"] === 'undefined'){
    filter["AppName"] = "TTSConfig"
  }
   
  applicationConfig.find(filter).sort({"id":-1})
  .then(async (config)=>{
      let latestConfig = config
      latestConfig[0]['Config']["Provider"] = req.params["Provider"]
      const updatedConfig = await applicationConfig.findByIdAndUpdate(latestConfig[0]["id"],latestConfig[0],{new:true})
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",updatedConfig)
      res.status(200).json(updatedConfig)
  })
  .catch((error)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution.")
      console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
      res.status(500).send(error)
  })
});

app.patch("/updateTTSGender/:Gender", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Application Config",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  let filter = {}
  if(typeof req.params["AppName"] === 'undefined'){
    filter["AppName"] = "TTSConfig"
  }
   
  applicationConfig.find(filter).sort({"id":-1})
  .then(async (config)=>{
      let latestConfig = config
      const provider = latestConfig[0]['Config']["Provider"]
      latestConfig[0]["Config"][provider]["ssmlGender"]=req.params["Gender"]
      const updatedConfig = await applicationConfig.findByIdAndUpdate(latestConfig[0]["id"],latestConfig[0],{new:true})
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",updatedConfig)
      res.status(200).json(updatedConfig)
  })
  .catch((error)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution.")
      console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
      res.status(500).send(error)
  })
});

app.patch("/updateSTTProvider/:Provider", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Application Config",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  let filter = {}
  if(typeof req.params["AppName"] === 'undefined'){
    filter["AppName"] = "STTConfig"
  }
   
  applicationConfig.find(filter).sort({"id":-1})
  .then(async (config)=>{
      let latestConfig = config
      latestConfig[0]['Config']["Provider"] = req.params["Provider"]
      const updatedConfig = await applicationConfig.findByIdAndUpdate(latestConfig[0]["id"],latestConfig[0],{new:true})
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution. Response:",updatedConfig)
      res.status(200).json(updatedConfig)
  })
  .catch((error)=>{
      console.info((new Date()).toString()+"|"+prependToLog,"End of Execution.")
      console.error((new Date()).toString()+"|"+prependToLog,"End of Execution. Error:",error)
      res.status(500).send(error)
  })
});

module.exports = app;
