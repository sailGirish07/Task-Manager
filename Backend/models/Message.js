const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // For direct messages
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "task_update"],
      default: "text",
    },
    // File-specific fields
    fileUrl: {
      type: String,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    fileType: {
      type: String,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deletedAt: {
      type: Date,
    },
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      readAt: {
        type: Date,
        default: Date.now,
      }
    }],
    attachments: [{
      filename: String,
      url: String,
      type: String, // image, document, etc.
    }],
  },
  { timestamps: true }
);

// Index for efficient querying
messageSchema.index({ recipient: 1, createdAt: -1 });

messageSchema.index({ sender: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);