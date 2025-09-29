const mongoose = require("mongoose");
const { Schema } = mongoose;

// Embedded Address Schema
const AddressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
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
      default: "Home",
    },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderId: {
      type: String,
      unique: true,
      sparse: true,
    },

    products: [
      {
        type: Schema.Types.Mixed,
        required: true,
      },
    ],

    price: { type: Number, required: true },

    currency: { type: String, default: "INR" },

    address: { type: AddressSchema, required: true },

    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    deliveryExpectedDate: {
      type: Date,
      default: () => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date;
      },
    },

    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },

    razorpayPaymentId: { type: String, default: null },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },

    paymentmode: {
      type: String,
      enum: ["COD", "Prepaid"],
      default: "Prepaid",
    },

    qikinkOrderId: { type: String },

    pf: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    printing: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// 🔹 Pre-save hook to auto-generate orderId
OrderSchema.pre("save", async function (next) {
  if (this.orderId) return next(); // already set

  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    const datePrefix = `${yyyy}${mm}${dd}`;

    // Count how many orders already created today
    const count = await mongoose.model("Order").countDocuments({
      createdAt: {
        $gte: new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`),
        $lte: new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`),
      },
    });

    this.orderId = `ORD-${datePrefix}-${String(count + 1).padStart(4, "0")}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Order", OrderSchema);
