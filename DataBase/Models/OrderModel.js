const mongoose = require("mongoose");
const { Schema } = mongoose;

// ------------------ Address Sub-Schema ------------------
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

// ------------------ Order Schema ------------------
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

    // ✅ New: Distinguish Corporate vs Retail orders
    orderType: {
      type: String,
      enum: ["B2B", "B2C"],
      default: "B2C",
    },

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

    // ✅ All payment modes you currently support
   paymentmode: {
  type: String,
  enum: [
    "online",
    "netbanking",
    "50%",
    "COD",
    "Prepaid",
    "store_pickup",
    "manual_payment",
    "Pay on Store",
    "Paid via Netbanking"

  ],
  default: "online",
},


    // ------------------ 🔹 Printrove Integration Fields ------------------
    printroveOrderId: { type: String, default: null }, // ID returned by Printrove
    printroveStatus: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Received",
        "Dispatched",
        "Delivered",
        "Cancelled",
        "Error",
        "success", // added lowercase success (API response)
      ],
      default: "Pending",
    },

    printroveItems: { type: Array, default: [] }, // store Printrove line-items
    printroveTrackingUrl: { type: String, default: "" }, // tracking link if available
    // ----------------------------------------------------

    pf: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    printing: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ------------------ Auto-generate Order ID ------------------
OrderSchema.pre("save", async function (next) {
  if (this.orderId) return next();

  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const datePrefix = `${yyyy}${mm}${dd}`;

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
