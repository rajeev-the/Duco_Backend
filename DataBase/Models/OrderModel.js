const mongoose = require("mongoose");

const { Schema } = mongoose;

// Embedded Address Schema
const AddressSchema = new Schema({
  fullName: { type: String, required: true },
  mobileNumber: { type: String },
  houseNumber: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  country: { type: String, default: "India" },
  landmark: { type: String, default: "" },
  addressType: {
    type: String,
    enum: ["Home", "Office", "Other"],
    default: "Home"
  }
}, { _id: false });

const OrderSchema = new Schema({
  products: [{
    type: Schema.Types.Mixed,
    required: true
  }],

  price: {
    type: Number,
    required: true
  },

  address: {
    type: AddressSchema,
    required: true
  },

  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  deliveryExpectedDate: {
    type: Date,
    default: () => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date;
    }
  },

  status: {
    type: String,
    enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
    default: "Pending"
  },

  razorpayPaymentId: {
    type: String,
    default: null
  },
  paymantmode: {
    type: String,
    enum: ["online", "netbanking"],
    default: "online"
  },

  qlinkOrderId: {
    type: String,
    default: null
  },
  pf:{
    type:Number,
    default:0,
  },
    gst:{
    type:Number,
    default:0,
  },
    printing:{
    type:Number,
    default:0,
  }



}, { timestamps: true });

module.exports = mongoose.model("Order", OrderSchema);
