const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    wardNumber: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      default: "",
      trim: true,
    },

    photo: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    photoFilename: {
      type: String,
      default: "",
      trim: true,
    },

    photoContentType: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved", "Rejected"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  },
);

const Complaint =
  mongoose.models.Complaint || mongoose.model("Complaint", complaintSchema);

module.exports = Complaint;
