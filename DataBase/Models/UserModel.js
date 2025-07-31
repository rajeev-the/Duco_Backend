const mongoose = require('mongoose');

// Address Subdocument Schema
const AddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  mobileNumber: {
    type: String,
    required: true
  },
  houseNumber: {
    type: String,
    required: true
  },
  street: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: 'India'
  },
  landmark: {
    type: String,
    default: ''
  },
  addressType: {
    type: String,
    enum: ['Home', 'Office', 'Other'],
    default: 'Home'
  }
}, {
  _id: false,
  timestamps: true
});

// User Schema with embedded Address
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  number: {
    type: String,
    required: true
  },
  address: [AddressSchema]  // Array of address objects
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
