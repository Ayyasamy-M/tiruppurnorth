const mongoose = require("mongoose");

const wardUpdateSchema = new mongoose.Schema(
  {
    wardNumber: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      default: "",
      trim: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

const WardUpdate =
  mongoose.models.WardUpdate || mongoose.model("WardUpdate", wardUpdateSchema);

module.exports = WardUpdate;
