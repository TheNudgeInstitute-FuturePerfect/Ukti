const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const schema = new Schema(
  {
    Module      :{type: String, required: true},
    StackTrace  :{type: String, required: true},
    Payload     :{type: String, required: true},
    Status      :{type: String, enum: ["Resolved","Not Resolved"], default:"Not Resolved"},
  },
  {
    timestamps: true,
  }
);

const ApplicationErrors = mongoose.model("ApplicationErrors", schema);

module.exports = ApplicationErrors
