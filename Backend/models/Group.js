const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }],
    admins: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Group admins who can manage the group
    }],
    isPrivate: {
      type: Boolean,
      default: false, // If true, requires invitation to join
    },
    avatar: {
      type: String, // URL to group avatar/image
    },
  },
  { timestamps: true }
);

// Index for efficient querying
groupSchema.index({ createdBy: 1 });
groupSchema.index({ members: 1 });
groupSchema.index({ name: 1 });

module.exports = mongoose.model("Group", groupSchema);