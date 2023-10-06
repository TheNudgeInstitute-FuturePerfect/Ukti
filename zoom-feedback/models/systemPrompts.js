const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const schema = new Schema(
  {
    Name        :{type: String, required: true},
    Content     :{type: String, required: true},
    IsActive    :{type: Boolean, required:true},
    Model       :{type: String, required:true},
    Temperature :{type: Number, required:true, min:0, max:1},
    Module      :{type: String},
  },
  {
    timestamps: true,
  }
);

const SystemPrompts = mongoose.model("SystemPrompts", schema);

module.exports = SystemPrompts
