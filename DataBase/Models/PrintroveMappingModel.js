const mongoose = require('mongoose');

const printroveMappingSchema = new mongoose.Schema(
  {
    // Duco product reference
    ducoProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
    },

    // Printrove product information
    printroveProductId: {
      type: Number,
      required: true,
    },

    printroveProductName: {
      type: String,
      required: true,
    },

    // Variant mappings for different sizes/colors
    variants: [
      {
        // Duco variant info
        ducoColor: String,
        ducoSize: String,

        // Printrove variant info
        printroveVariantId: {
          type: Number,
          required: true,
        },
        printroveVariantName: String,
        printroveSku: String,

        // Pricing
        printrovePrice: Number,

        // Availability
        isAvailable: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Design upload mappings
    designMappings: [
      {
        designType: {
          type: String,
          enum: ['front', 'back', 'left', 'right'],
          required: true,
        },
        printroveDesignId: Number,
        printroveDesignName: String,
        uploadUrl: String,
      },
    ],

    // Sync information
    lastSynced: {
      type: Date,
      default: Date.now,
    },

    syncStatus: {
      type: String,
      enum: ['active', 'inactive', 'error'],
      default: 'active',
    },

    // Additional metadata
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for faster lookups
printroveMappingSchema.index({ ducoProductId: 1 });
printroveMappingSchema.index({ printroveProductId: 1 });
printroveMappingSchema.index({ 'variants.printroveVariantId': 1 });

module.exports = mongoose.model('PrintroveMapping', printroveMappingSchema);
