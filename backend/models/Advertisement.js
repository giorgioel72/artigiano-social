const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Il titolo è obbligatorio'],
    trim: true
  },
  description: {
    type: String,
    maxlength: 200
  },
  imageUrl: {
    type: String,
    required: [true, 'L\'immagine è obbligatoria']
  },
  linkUrl: {
    type: String,
    required: [true, 'Il link di destinazione è obbligatorio']
  },
  placement: {
    type: String,
    enum: ['dashboard_top', 'dashboard_sidebar', 'dashboard_bottom'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  clicks: {
    type: Number,
    default: 0
  },
  impressions: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Advertisement', advertisementSchema);
