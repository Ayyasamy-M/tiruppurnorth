const mongoose = require("mongoose");

const wardMemberSchema = new mongoose.Schema(
  {
    wardNumber: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      default: "",
      trim: true,
    },

    mobile: {
      type: String,
      default: "",
      trim: true,
    },

    photo: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const WardMember =
  mongoose.models.WardMember || mongoose.model("WardMember", wardMemberSchema);

module.exports = WardMember;
