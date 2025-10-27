// models/DesignModel.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const DesignSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    products: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      
    },
    cutomerprodcuts:{
        type:String,
        default:null
    },
    design: {
      type: [Schema.Types.Mixed], // can hold array of objects
      default: []
    }
  },
  {
    timestamps: true // adds createdAt and updatedAt
  }
);

module.exports = mongoose.model('Design', DesignSchema);
