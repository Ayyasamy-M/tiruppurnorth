const mongoose = require("mongoose");

const wardSchema = new mongoose.Schema(
  {
    wardNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    totalPeople: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Ward = mongoose.models.Ward || mongoose.model("Ward", wardSchema);

module.exports = Ward;
