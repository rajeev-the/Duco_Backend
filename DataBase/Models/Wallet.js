const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one wallet per user
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    transactions: [
      {
        order: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        amount: {
          type: Number,
          required: true,
        },
        type: {
          type: String,
          enum: ["50%", "100%"], // add/remove
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);
