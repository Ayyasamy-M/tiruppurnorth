const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    // User profile details
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    // GridFS file ID for profile photo
    photo: {
      type: String,
      default: "",
      trim: true,
    },

    // Ward is assigned separately.
    // User should not be able to freely change this.
    ward: {
      type: String,
      default: "",
      trim: true,
    },

    role: {
      type: String,
      enum: ["user", "admin", "ward_member"],
      default: "user",
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;
