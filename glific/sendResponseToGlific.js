
module.exports = (flowID,contactID,resultJSON,resultVariable,responseObject,startTimeStamp, execID) => {
    return new Promise((resolve,reject)=>{
        const executionID = (typeof execID === 'undefined') ? Math.random().toString(36).slice(2) : execID

        //Prepare text to prepend with logs
        const params = ["Send Reponse to Glific",executionID,""]
        const prependToLog = params.join(" | ")
            
        console.info((new Date()).toString()+"|"+prependToLog,"Execution Started")

        console.info((new Date()).toString()+"|"+prependToLog,"Request: ", flowID, " | ", contactID, " | ", resultJSON);
        var responseJSON = {
            OperationStatus: "REQ_ERR",
            ErrorDescription: null,
        };
        if (typeof responseObject === "undefined") {
            responseJSON["ErrorDescription"] = "responseObject missing";
            console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
            reject(JSON.stringify(responseJSON));
        } else if (typeof resultVariable === "undefined") {
            responseJSON["ErrorDescription"] = "resultVariable missing";
            console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
            reject(JSON.stringify(responseJSON));
        } else if (typeof flowID === "undefined") {
            responseJSON["ErrorDescription"] = "flowID missing";
            console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
            reject(JSON.stringify(responseJSON));
        } else if (typeof contactID === "undefined") {
            responseJSON["ErrorDescription"] = "contactID missing";
            console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
            reject(JSON.stringify(responseJSON));
        } else if (typeof resultJSON === "undefined") {
            responseJSON["ErrorDescription"] = "resultJSON missing";
            console.info((new Date()).toString()+"|"+prependToLog,"Returned: ", responseJSON);
            reject(JSON.stringify(responseJSON));
        } else {
            responseObject.status(200).json(resultJSON)
            responseJSON["OperationStatus"] = "SUCCESS";
            //Send Reponse to Glific
            let endTimeStamp = new Date();
            let executionDuration = (endTimeStamp - startTimeStamp) / 1000;
            if (executionDuration > 5) {
                let resultJSONObject = {}
                resultJSONObject[resultVariable] = resultJSON
                
                console.info((new Date()).toString()+"|"+prependToLog,"Sending request to Glific to resume flow");
                const request = require("request");
                //Get Auth Token
                var options = {
                    method: process.env.AuthMethod,
                    url: process.env.AuthURL
                        .toString()
                        .replace("{1}", process.env.AuthUser.toString())
                        .replace("{2}", process.env.AuthPwd.toString()),
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        query: ``,
                        variables: {},
                    }),
                };
                request(options, function (error, response) {
                    if (error) {
                        console.info((new Date()).toString()+"|"+prependToLog,"Error in Glific Authentication API Call: " + error);
                        console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
                        responseJSON["OperationStatus"] = "GLFC_AUTH_ERR";
                        responseJSON["ErrorDescription"] = error;
                        reject(JSON.stringify(responseJSON));
                    } else if (response.body == "Something went wrong") {
                        console.info((new Date()).toString()+"|"+prependToLog,
                        "Error returned by Glific Authentication API: " + response.body
                        );
                        console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
                        responseJSON["OperationStatus"] = "GLFC_AUTH_ERR";
                        responseJSON["ErrorDescription"] = response.body;
                        reject(JSON.stringify(responseJSON));
                    } else {
                        console.info((new Date()).toString()+"|"+prependToLog,"Successfully Authenticated with Glific");
                        let responseBody = JSON.parse(response.body);
                        const authToken = responseBody.data.access_token;
                        console.info((new Date()).toString()+"|"+prependToLog,"Extracted access token from response");
                        console.info((new Date()).toString()+"|"+prependToLog,
                        "Resuming flow " +
                            flowID +
                            " for ContactID " +
                            contactID +
                            " in Glific"
                        );
                        options = {
                            method: process.env.OperationMethod.toString(),
                            url: process.env.OperationURL.toString(),
                            headers: {
                                Authorization: authToken,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                query: `mutation resumeContactFlow($flowId: ID!, $contactId: ID!, $result: Json) {
                                                resumeContactFlow(flowId: $flowId, contactId: $contactId, result: $result) {
                                                    success
                                                    errors {
                                                        key
                                                        message
                                                    }
                                                }
                                            }`,
                                variables: {
                                    flowId: flowID,
                                    contactId: contactID,
                                    result: JSON.stringify(resultJSONObject),
                                },
                            }),
                        };
                        request(options, function (error, response) {
                            //If any error in API call throw error
                            if (error) {
                                console.info((new Date()).toString()+"|"+prependToLog,"Error in resuming flow in Glific: " + error);
                                console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
                                responseJSON["OperationStatus"] = "GLFC_API_ERR";
                                responseJSON["ErrorDescription"] = error;
                                reject(JSON.stringify(responseJSON));
                            } else {
                                console.info((new Date()).toString()+"|"+prependToLog,"Glific Response: " + response.body);
                                console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
                                const resumeFlowResponse = JSON.parse(response.body);
                                //If any error retruned by Glific API throw error
                                if (resumeFlowResponse.errors != null) {
                                    console.info((new Date()).toString()+"|"+prependToLog,
                                        "Error returned by Glific API: " +
                                        JSON.stringify(resumeFlowResponse)
                                    );
                                    console.info((new Date()).toString()+"|"+prependToLog,"Request Parameters: " + JSON.stringify(options));
                                    responseJSON["OperationStatus"] = "GLFC_API_ERR";
                                    responseJSON["ErrorDescription"] = resumeFlowResponse.errors;
                                    reject(JSON.stringify(responseJSON));
                                } else {
                                    const elementData = resumeFlowResponse.data;
                                    const elementResumeFlow = elementData.resumeContactFlow;
                                    const elementErrors = elementResumeFlow.errors;
                                    if (elementErrors != null) {
                                        console.info((new Date()).toString()+"|"+prependToLog,
                                        "Error returned by Glific API " +
                                            JSON.stringify(resumeFlowResponse)
                                        );
                                        responseJSON["OperationStatus"] = "GLFC_API_ERR";
                                        responseJSON["ErrorDescription"] = elementErrors;
                                        reject(JSON.stringify(responseJSON));
                                    } else {
                                        console.info((new Date()).toString()+"|"+prependToLog,"Successfully resumed flow in Glific");
                                        responseJSON["OperationStatus"] = "SUCCESS";
                                        resolve(JSON.stringify(responseJSON));
                                    }
                                }
                            }
                        });
                    }
                });
            }
            else
                resolve(JSON.stringify(responseJSON))
        }
    })
};
