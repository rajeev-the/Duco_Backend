const mongoose = require('mongoose');

const LogisticSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    trackingNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    carrier: {
        type: String
    },
    estimatedDelivery: {
        type: Date
    },
    shippingAddress: {
        type: String,
        required: true
    },
    img:[
        {
            URL: { type: String

            }
        }
    ],
    note: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});
const Logistic = mongoose.model("Logistic", LogisticSchema);

module.exports = Logistic; // <-- default export is the MODEL