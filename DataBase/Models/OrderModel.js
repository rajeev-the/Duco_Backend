const mongoose = require('mongoose');
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
    country: { type: String, default: 'India' },
    landmark: { type: String, default: '' },
    addressType: {
      type: String,
      enum: ['Home', 'Office', 'Other'],
      default: 'Home',
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
    totalPay: { type: Number, required: true }, // ✅ Add totalPay field for Printrove compatibility
    currency: { type: String, default: 'INR' },

    address: { type: AddressSchema, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // ✅ New: Distinguish Corporate vs Retail orders
    orderType: {
      type: String,
      enum: ['B2B', 'B2C'],
      default: 'B2C',
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
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },

    razorpayPaymentId: { type: String, default: null },

    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
    },

    // ✅ All payment modes you currently support
    paymentmode: {
      type: String,
      enum: [
        'online',
        'Online Payment',
        'netbanking',
        'Paid via Netbanking',
        'store_pickup',
        'Pay on Store',
        'manual_payment',
        'Manual Payment',
        '50%',
        'COD',
        'Prepaid',
      ],
      default: 'online',
    },

    // ------------------ 🔹 Printrove Integration Fields ------------------
    printroveOrderId: { type: String, default: null }, // ID returned by Printrove
    printroveStatus: {
      type: String,
      enum: [
        'Pending',
        'Processing',
        'Received',
        'Dispatched',
        'Delivered',
        'Cancelled',
        'Error',
        'success', // added lowercase success (API response)
      ],
      default: 'Pending',
    },

    printroveItems: { type: Array, default: [] }, // store Printrove line-items
    printroveTrackingUrl: { type: String, default: '' }, // tracking link if available
    // ----------------------------------------------------

    pf: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    printing: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ------------------ Auto-generate Order ID ------------------
OrderSchema.pre('save', async function (next) {
  if (this.orderId) return next();

  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const datePrefix = `${yyyy}${mm}${dd}`;

      // Use a more robust counting method with timestamp to avoid race conditions
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');

      // Try to find a unique orderId
      let orderId = `ORD-${datePrefix}-${String(timestamp).slice(
        -4
      )}-${randomSuffix}`;

      // Check if this orderId already exists
      const existingOrder = await mongoose.model('Order').findOne({ orderId });
      if (!existingOrder) {
        this.orderId = orderId;
        return next();
      }

      attempts++;

      // If we've tried too many times, use a fallback with UUID
      if (attempts >= maxAttempts) {
        const { v4: uuidv4 } = require('uuid');
        this.orderId = `ORD-${datePrefix}-${uuidv4()
          .substring(0, 8)
          .toUpperCase()}`;
        return next();
      }

      // Small delay before retry
      await new Promise((resolve) => setTimeout(resolve, 10));
    } catch (err) {
      console.error('Error generating orderId:', err);
      attempts++;

      if (attempts >= maxAttempts) {
        // Final fallback
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        this.orderId = `ORD-${yyyy}${mm}${dd}-${Date.now()}`;
        return next();
      }
    }
  }
});

module.exports = mongoose.model('Order', OrderSchema);
