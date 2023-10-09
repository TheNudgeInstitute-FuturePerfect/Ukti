const express = require("express");
const app = express.Router();

// Advanced I/O const
const processStudentAudio = require("./processStudentAudio.js");
const appConfig = require("./ApplicationConfigCRUD.js");
const systemPromptConfig = require("./SystemPromptsCRUD.js");
const storeAnswers = require("./storeAnswers.js");
const getParams = require("./getFeedbackParams.js");
const report = require("./reports/report.js");
const appError = require("./ApplicationErrorCRUD.js");

// Advanced I/O routes
app.use("/processStudentAudio",processStudentAudio);
app.use("/appconfig",appConfig);
app.use("/systemprompt",systemPromptConfig);
app.use("/storeAnswers",storeAnswers);
app.use("/getParams",getParams);
app.use("/report",report);
app.use("/apperror",appError);

module.exports = app;
