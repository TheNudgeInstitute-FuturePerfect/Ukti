
module.exports = async (studentID,studentName,studentMobile ) => {
	return new Promise((resolve,reject)=>{
		const executionID = Math.random().toString(36).slice(2)

		//Prepare text to prepend with logs
		const logparams = ["Create Contact in Glific",executionID,""]
		const prependToLog = logparams.join(" | ")
			
		console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")

		console.info((new Date()).toString()+"|"+prependToLog,"Request for: ",studentID)
		var responseJSON = {
			OperationStatus:"REQ_ERR",
			StatusDescription:null
		}
		if(typeof studentName === 'undefined'){
			responseJSON["StatusDescription"] = "studentName missing";
			console.info((new Date()).toString()+"|"+prependToLog,"Returned: ",responseJSON)
			reject(JSON.stringify(responseJSON));
		}
		else if(typeof studentMobile === 'undefined'){
			responseJSON["StatusDescription"] = "studentMobile missing";
			console.info((new Date()).toString()+"|"+prependToLog,"Returned: ",responseJSON)
			reject(JSON.stringify(responseJSON));	
		}
		else{
			responseJSON['OperationStatus'] = "SUCCESS"
			console.info((new Date()).toString()+"|"+prependToLog,"Sending request to Glific for Authentication");
			const request = require('request');
			//Get Auth Token
			var options = {
				'method': process.env.AuthMethod,
				'url': process.env.AuthURL.toString().replace('{1}',process.env.AuthUser.toString()).replace('{2}',process.env.AuthPwd.toString()),
				'headers': {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					query: ``,
					variables: {}
				})
			};
			request(options, function (error, response) {
				if (error){
					console.info((new Date()).toString()+"|"+prependToLog,"Error in Glific Authentication API Call: "+error);
					console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
					responseJSON['OperationStatus'] = "GLFC_AUTH_ERR"
					responseJSON['StatusDescription'] = error
					reject(JSON.stringify(responseJSON))
				}
				else if(response.body == 'Something went wrong'){
					console.info((new Date()).toString()+"|"+prependToLog,"Error returned by Glific Authentication API: "+response.body);
					console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
					responseJSON['OperationStatus'] = "GLFC_AUTH_ERR"
					responseJSON['StatusDescription'] = response.body
					reject(JSON.stringify(responseJSON))
				}
				else{
					console.info((new Date()).toString()+"|"+prependToLog,"Successfully Authenticated with Glific");
					try{
						let responseBody = JSON.parse(response.body)
						const authToken = responseBody.data.access_token;
						console.info((new Date()).toString()+"|"+prependToLog,"Extracted access token from response."+
									"\Creating Contact in Glific for "+ studentID);
						const currentDateTime = new Date().toISOString();
						options = {
							'method': process.env.OperationMethod.toString(),
							'url': process.env.OperationURL.toString(),
							'headers': {
								'Authorization': authToken,
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({
								query: `mutation createContact($input:ContactInput!) {
									createContact(input: $input) {
										contact {
											id
											name
											optinTime
											optoutTime
											phone
											bspStatus
											status
											tags {
												id
												label
											}
										}
										errors {
											key
											message
										}
									}
								}`,
								variables: {
									"input":{
										"name":studentName,
										"phone":('91'+studentMobile).slice(-12),
										"bspStatus":process.env.NewGlificContactBSPStatus,
										"fields":"{\"name\":{\"value\":\""+studentName+"\",\"type\":\"string\",\"inserted_at\":\""+currentDateTime+"\"}}"
									}
								}
							})
						};
						request(options, async function (error, response) {
							//If any error in API call throw error
							if (error){
								console.info((new Date()).toString()+"|"+prependToLog,"Error in Creating Contact in Glific: "+error);
								console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
								throw new Error("GLFC_CRTE_CNTCT_ERR")
							}
							else{
								const createContactResponse = JSON.parse(response.body)
	
								//If any error retruned by Glific API throw error
								if(createContactResponse.errors != null){
									console.info((new Date()).toString()+"|"+prependToLog,"Error returned by Glific API: "+JSON.stringify(createContactResponse));
									console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
									throw new Error("GLFC_CRTE_CNTCT_ERR")							
								}
								else{
									const elementData = createContactResponse.data
									const elementCreateContact = elementData.createContact
									const elementErrors = elementCreateContact.errors
									const getContact = (mobile, authToken) => {
										return new Promise((resolve, reject)=>{
											const searchContactOptions = {
												'method': process.env.OperationMethod.toString(),
												'url': process.env.OperationURL.toString(),
												'headers': {
													'Authorization': authToken,
													'Content-Type': 'application/json'
												},
												body: JSON.stringify({
													query: `query contacts($filter: ContactFilter, $opts: Opts) {
														contacts(filter: $filter, opts:$opts) {
															id
															name
															optinTime
															optoutTime
															phone
															bspStatus
															status
															tags {
																id
																label
															}
															lastMessageAt
															language {
																label
															}
															fields
															settings
														}
													}`,
													variables: {
														"filter":{
															"phone":mobile
														},
														"opts":{
															"order":"ASC",
															"limit":1,
															"offset":0
															}
														}
												})
											};
											request(searchContactOptions, function (error, response) {
												//If any error in API call throw error
												if (error){
													console.info((new Date()).toString()+"|"+prependToLog,"Error in Search Contact API Call: "+error);
													console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
													reject("GLFC_SRCH_CNTCT_ERR")					
												}
												else{
													const searchContacResponse = JSON.parse(response.body)
													//If any error retruned by Glific API throw error
													if(searchContacResponse.errors != null)
													{
														console.info((new Date()).toString()+"|"+prependToLog,"Error returned by SearchContact API: "+JSON.stringify(searchContacResponse.errors));
														console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(searchContactOptions));
														reject("GLFC_SRCH_CNTCT_ERR")					
													}
													else
													{
														const elementData = searchContacResponse.data
														const elementSearchContact = elementData.contacts[0]
														if(elementSearchContact == null)
														reject("GLFC_NO_CNTCT_ERR")					
														else 
															resolve(elementSearchContact['id'])
													}
												}
											})
										})
									}
									var contactID = null;
									if(elementErrors != null) 
										if(elementErrors[0]["message"]!="Phone: has already been taken"){
											console.info((new Date()).toString()+"|"+prependToLog,'Error returned by Glific API: '+JSON.stringify(createContactResponse)+' | Options: '+JSON.stringify(options))
											throw new Error("GLFC_CRTE_CNTCT_ERR")
										}
										else
										{
											console.info((new Date()).toString()+"|"+prependToLog,"Contact already present in Glific. Getting the Contact ID....")
											contactID = await getContact(studentMobile,authToken)
										}
									else
									{	
										contactID = createContactResponse.data.createContact.contact.id
										console.info((new Date()).toString()+"|"+prependToLog,"Successfully added Student in Glific Contact List with ID: "+contactID);
									}
									console.info((new Date()).toString()+"|"+prependToLog,"Configuring Opt In for "+ studentID);
									options = {
										'method': process.env.OperationMethod.toString(),
										'url': process.env.OperationURL.toString(),
										'headers': {
											'Authorization': authToken,
											'Content-Type': 'application/json'
										},
										body: JSON.stringify({
											query: `mutation optinContact($phone: String!, $name: String) {
												optinContact(phone: $phone, name: $name) {
													contact {
														id
														phone
														name
														lastMessageAt
														optinTime
														bspStatus
													}
													errors {
														key
														message
													}
												}
											}`,
											variables: {
												"name":studentName,
												"phone":studentMobile,
												"lastMessageAt":currentDateTime,
												"bspStatus":process.env.NewGlificContactBSPStatus,
											}
										})
									};
									request(options, function (error, response) {
										//If any error in API call throw error
										if (error){
											console.info((new Date()).toString()+"|"+prependToLog,"Error in OptIn API Call: "+error);
											console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
											//Return contact ID
											console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed")
											resolve(contactID)
										}
										else{
											const optInResponse = JSON.parse(response.body)
											//If any error retruned by Glific API throw error
											if(optInResponse.errors != null)
											{
												console.info((new Date()).toString()+"|"+prependToLog,"Error rreturned by OptIn API: "+JSON.stringify(optInResponse.errors));
												console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
												//Return contact ID
												console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed")
												resolve(contactID)
											}
											else
											{
												const elementData = optInResponse.data
												const elementOptInContact = elementData.optinContact
												const elementErrors = elementOptInContact.errors
												if(elementErrors != null) throw Error('Error returned by Glific API : '+JSON.stringify(optInResponse)+' | Options: '+JSON.stringify(options))
												console.info((new Date()).toString()+"|"+prependToLog,"Successfully opted in Student in Glific with contact ID: "+contactID);
												console.info((new Date()).toString()+"|"+prependToLog,"Execution Completed")
												resolve(contactID)
											}	
										}
									});
								}
							}
						});
					}
					catch(error){
						console.info((new Date()).toString()+"|"+prependToLog,"Error in creating contact in Glific: "+error,"\nGlific Response: ",response.body);
						console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: "+JSON.stringify(options));
						responseJSON['OperationStatus'] = "GLFC_API_ERR"
						responseJSON['StatusDescription'] = error
						reject(JSON.stringify(responseJSON))
					}
				}
			});
		}
	})
}