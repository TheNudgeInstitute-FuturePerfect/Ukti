const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const interactionsSchema = new Schema({
  Bot         :{type: String, required: true},
  User        :{type: String, required: true},
  TimeStamp   :{type: Date, required: true},
})

const feedbackSchema = new Schema({
  MsgSent         :{type: Boolean, required: true, default: false},
  TimeStamp       :{type: Date, required: true},
  Interactions    :[interactionsSchema]
})

const promptOutputSchema = new Schema({
  Prompt            : {type: String, required: true},
  ChatGPTReply      : {type: String, required: true},
  CompletionTokens  : {type: Number, required: true}, 
  PromptTokens      : {type: Number, required: true} 
})

const sessionsSchema = new Schema({
  Date              :{type: Date, required: true},
  DayOfProgression  :{type: Number, required: true}, 
  AudioFileS3URI    :{type: String, required: true},
  PromptOutput      :[promptOutputSchema],
  Feedback          :{type:feedbackSchema, required:false}
})

const schema = new Schema(
  {
    Mobile          :{type: Number, required: true, min:6000000000, max:9999999999},
    Name            :{type: String, required: true},
    FPID            :{type: String, required: true},
    GlificID        :{type: Number, required: true},
    Consent         :{type: Boolean, required: true, default: false},
    Sessions        :[sessionsSchema]
  },
  {
    timestamps: true,
  }
);

const Students = mongoose.model("Students", schema);

module.exports = Students