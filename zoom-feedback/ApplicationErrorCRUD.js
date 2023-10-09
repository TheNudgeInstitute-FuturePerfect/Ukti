"use strict";

const express = require("express");
const applicationError = require("./models/applicationErrors.js")

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
    const params = ["Application Error",req.method,executionID,""]
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
      applicationError.create(requestBody)
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

app.get("/:id", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Application Error",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
  let filter = {}
  if(typeof req.params["id"] !== 'undefined'){
    if(req.params["id"]!='*')
      filter["_id"] = req.params["id"]
  }

  applicationError.find(filter)
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

app.get("/module/:Module", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Application Error",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
  let filter = {}
  if(typeof req.params["Module"] !== 'undefined'){
    if(req.params["Module"]!='*')
      filter["Module"] = req.params["Module"]
  }

  applicationError.find(filter)
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

app.get("/status/:Status", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Application Error",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
  let filter = {}
  if(typeof req.params["Status"] !== 'undefined'){
    if(req.params["Status"]!='*')
      filter["Status"] = req.params["Status"]
  }

  applicationError.find(filter)
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

app.get("/between/:startDate/:endDate", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Application Error",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
    
  let filter = {
    "createdAt": {
        $gte: req.params["startDate"],
        $lte: req.params["endDate"]
    }
  }

  applicationError.find(filter)
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

app.patch("/:id/status", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Application Error",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  let filter = {}
  if(typeof req.params["id"] !== 'undefined'){
    filter["_id"] = req.params["id"]
  }
  
  applicationError.findOneAndUpdate(filter,{Status:req.body.Status}, {new:true})
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

app.delete("/:id", (req, res) => {
    
  const executionID = Math.random().toString(36).slice(2)

  //Prepare text to prepend with logs
  const params = ["Application Error",req.method,req.url,executionID,""]
  const prependToLog = params.join(" | ")
  
  console.info((new Date()).toString()+"|"+prependToLog,"Start of Execution")
  
  applicationError.findByIdAndDelete(req.params['id'])
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

module.exports = app;
