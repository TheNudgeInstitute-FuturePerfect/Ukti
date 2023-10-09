const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose')

const zoomFeedback = require("./zoom-feedback/index.js");

const app = express();

mongoose.connect(process.env.MongoDBConnStrng + "ukti", {
  useNewUrlParser: true,
});

// Use the json and urlencoded middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use("/ukti/api/feedback", zoomFeedback);

app.listen(process.env.UKTI_PORT, () => {
  console.log(`API listening on port ${process.env.UKTI_PORT}!`);
});
