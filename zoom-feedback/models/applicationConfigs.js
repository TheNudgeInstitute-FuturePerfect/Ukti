const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const schema = new Schema(
  {
    AppName    :{type: String, required: true},
    Config     :{type: Schema.Types.Mixed, required: true}
  },
  {
    timestamps: true,
  }
);

const ApplicationConfigs = mongoose.model("ApplicationConfigs", schema);

module.exports = ApplicationConfigs
