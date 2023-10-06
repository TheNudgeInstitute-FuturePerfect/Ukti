const students = require("../../models/students.js")
const applicationError = require("../../models/applicationErrors.js")
const _retry = require("async-retry");
const { isNull } = require("util");
const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose')

const app = express();

mongoose.connect(process.env.MongoDBConnStrng+"ukti", {
	useNewUrlParser: true,
  });
  

const executionID = Math.random().toString(36).slice(2)

//Prepare text to prepend with logs
const params = ["sendDailyFeedback",executionID,""]
const prependToLog = params.join(" | ")
	
console.info((new Date()).toString()+"|"+prependToLog,(new Date()).toString()+"|"+prependToLog,"Execution Started")

//Get the current time
let currentDate = new Date()
//currentDate.setHours(currentDate.getHours()+5)
//currentDate.setMinutes(currentDate.getMinutes()+30)
const currentHour = ("0"+currentDate.getHours()).slice(-2) + ":00"
const currentDt = new Date(currentDate.getFullYear(),currentDate.getMonth(),currentDate.getDate(),0,0,0)
console.info((new Date()).toString()+"|"+prependToLog,"Current TimeStamp = ",currentDate," | Current Hour = ",currentHour)

let query = {
	'Sessions.Date':{
		"$gte": currentDt
	}
}

students.find(query)
.then((users) =>	{
	console.info((new Date()).toString()+"|"+prependToLog,"Fetched Records")
	//If there is no record, then the mobile number does not exist in system. Return error				
	if(users == null){
		//Send the response
		console.info((new Date()).toString()+"|"+prependToLog,'End of Execution: No user who has record updated for today');
	}
	else if(users.length == 0){
		//Send the response
		console.info((new Date()).toString()+"|"+prependToLog,'End of Execution: No user who has record updated for today');
	}
	else{
		const request = require("request");

		var authToken = null;
		var renewToken = null;
		var tokenExpiryTime = null

		const timer = (sleepTime) => {
			return new Promise( async (resolve,reject) => {
				//console.info((new Date()).toString()+"|"+prependToLog,'Wait for '+sleepTime)
				setTimeout(resolve, sleepTime)
			});
		}

		//Get Auth Token
		const checkAccessTokenStatus = (renew) => {
			return new Promise((resolve, reject)=>{
				const options = {
					'method': renew==false ? process.env.AuthMethod : process.env.RenewalMethod,
					'url': renew==false ? process.env.AuthURL.toString().replace('{1}',process.env.AuthUser.toString()).replace('{2}',process.env.AuthPwd.toString()) : process.env.RenewalURL.toString().replace('{1}',process.env.RenewalUser.toString()).replace('{2}',process.env.RenewalPwd.toString()),
					'headers': renew==false ? {'Content-Type': 'application/json'} : {"Authorization": renewToken},
					body: JSON.stringify({
						query: ``,
						variables: {}
					})
				};
				request(options, function (error, response) {
					if (error){
						console.error((new Date()).toString()+"|"+prependToLog,"Error in Glific Authentication API Call: "+error);
						console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
						reject("GLFC_AUTH_ERR")                            
					}
					else if(response.body == 'Something went wrong'){
						console.error((new Date()).toString()+"|"+prependToLog,"Error returned by Glific Authentication API: "+response.body);
						console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
						reject("GLFC_AUTH_ERR")
					}
					else{
						try{
							let responseBody = JSON.parse(response.body)
							//console.debug((new Date()).toString()+"|"+prependToLog,responseBody)
							authToken = responseBody.data.access_token;
							renewToken = responseBody.data.renewal_token;
							tokenExpiryTime = new Date(responseBody.data.token_expiry_time)
							console.info((new Date()).toString()+"|"+prependToLog,"Extracted access token from response. Valid till: "+tokenExpiryTime);
							resolve(authToken)
						}
						catch(e){
							console.info((new Date()).toString()+"|"+prependToLog,"Error in getting Auth Token from Glific: "+e,"\nGlific Response: ",response.body,"Request Parameters: "+JSON.stringify(options))
							resolve(authToken)
						}
					}
				})
			})
		}
		
		const invokeGlificAPI = (type='HSM',id,contactID,params=[]) =>{
			return new Promise(async (resolve, reject)=>{
				const currentDateTime = new Date();
				const options = {
					'method': process.env.operationMethod.toString(),
					'url': process.env.operationURL.toString(),
					'headers': {
						'Authorization': authToken==null ? await checkAccessTokenStatus(false) : ((tokenExpiryTime-currentDateTime) > 60000 ? authToken : await checkAccessTokenStatus(true)),
						'Content-Type': 'application/json'
					},
					body: type=='Flow' ? JSON.stringify({
						query: `mutation startContactFlow($flowId: ID!, $contactId: ID!) {
									startContactFlow(flowId: $flowId, contactId: $contactId) {
										success
										errors {
											key
											message
										}
									}
								}`,
						variables: {
							"flowId": id,
							"contactId": contactID
						}
					}) : JSON.stringify({
						query: `mutation sendHsmMessage($templateId: ID!, $receiverId: ID!, $parameters: [String]) {
							sendHsmMessage(templateId: $templateId, receiverId: $receiverId, parameters: $parameters) {
								message{
									id
									body
									isHsm
								}
								errors {
									key
									message
								}
							}
						}`,
						variables: {
							"templateId": id,
							"receiverId": contactID,
							"parameters": params
						}
					})
				};
				request(options, async function (error, response) {
					//If any error in API call throw error
					if (error){
						console.error((new Date()).toString()+"|"+prependToLog,(type=='Flow' ? "Error in resuming flow in Glific: " : "Error in sending HSM Message")+error);
						console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
						reject("GLFC_API_ERR")
					}
					else{
						//console.debug((new Date()).toString()+"|"+prependToLog,'Glific Response: '+response.body+"\n"+
						//			"\nRequest Parameters: "+JSON.stringify(options));
						try{
							const apiResponse = JSON.parse(response.body)
							//If any error returned by Glific API throw error
							if(apiResponse.errors != null)
							{
								console.error((new Date()).toString()+"|"+prependToLog,"Error returned by Glific API: "+JSON.stringify(apiResponse.errors));
								console.error((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
								reject("GLFC_API_ERR")
							}
							else
							{
								const elementData = apiResponse.data
								const elementMessage = type=='Flow' ? elementData.startContactFlow : elementData.sendHsmMessage
								const elementErrors = elementMessage.errors
								if(elementErrors != null) 
								{
									console.error((new Date()).toString()+"|"+prependToLog,'Error returned by Glific API '+JSON.stringify(apiResponse))
									if(JSON.stringify(apiResponse).includes('Not able to fetch the template') || JSON.stringify(apiResponse).includes("Resource not found"))
										reject("GLFC_REQ_ERR")
									else
										reject("GLFC_API_ERR")
								}
								else
								{
									console.info((new Date()).toString()+"|"+prependToLog,type=='Flow' ? "Successfully started Nudge Flow in Glific" : "Successfully sent HSM Message");
									resolve("SUCCESS")
								}

							}
						}catch(e){
							console.error((new Date()).toString()+"|"+prependToLog,"Error returned from Glific: "+e,"\nGlific Response: ",response.body,"Request Parameters: "+JSON.stringify(options));
							reject("GLFC_API_ERR")
						}
					}
				});
			})
		}

		users.forEach(async (user,i)=>{
						
			console.info((new Date()).toString()+"|"+prependToLog,'Feedback to be sent to '+user.id);

			const todaysSession = user['Sessions'].filter(session=>session.Date>=currentDt)
							
			var type = "Flow"
			var id = process.env.GlificFeedbackFlowID
			if(type!=null){
				let messageSent = false
				for(var index = 0 ; index < 100; index++){
					try{
						const output = await invokeGlificAPI(type,id,user.GlificID)
						if(output=='SUCCESS')
							messageSent = true
						break;
					}
					catch(err){
						if(err.toString().includes("TOO_MANY_REQUEST")){
							await timer(Math.random()*60000)
							console.info((new Date()).toString()+"|"+prependToLog,i+":Retrying Feedback Message for "+ user.id);
						}
						else if(["GLFC_AUTH_API_ERR","GLFC_AUTH_ERR","GLFC_API_ERR"].includes(err)){
							await timer(Math.random()*10000)
							console.info((new Date()).toString()+"|"+prependToLog,i+":Retrying Feedback Message for "+ user.id);
						}
						else{
							console.error((new Date()).toString()+"|"+prependToLog,i+":Feedback not sent to "+user.id+" due to error: ",err)
							applicationError.create({
								StackTrace:err,
								Payload:JSON.stringify(user)
							}).then(()=>{})
							break;
						}
					}
				}
				if(messageSent==true)
					console.info((new Date()).toString()+"|"+prependToLog,i+":Feeback sent to "+user.id)
				else
					console.info((new Date()).toString()+"|"+prependToLog,i+":Feedback not sent to "+users.id)
				await students.findByIdAndUpdate(user.id,
					{
						$set:{
							"Sessions.$[t].Feedback":{
								MsgSent         :messageSent,
								TimeStamp       :currentDate
							}
						}
					},
					{
						arrayFilters:[{
							"t._id":todaysSession[0]['id']
						}]
					},
					{new:true}
				)
				console.info((new Date()).toString()+"|"+prependToLog,i+":Feeback Status updated in record "+todaysSession[0]['id']+" of "+user.id)
			}
		});
	}
	console.info((new Date()).toString()+"|"+prependToLog,"Closing Execution")
}).catch(err => {
	console.error((new Date()).toString()+"|"+prependToLog,'Closing Execution. Encountered Error in getting user records: '+err)
	applicationError.create({
		Module:"sendDailyFeedback",
		StackTrace:err,
		Payload:JSON.stringify(query)
	}).then(()=>{})
})