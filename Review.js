const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  work: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Work'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    maxlength: 500
  },
  professionalità: {
    type: Number,
    min: 1,
    max: 5
  },
  qualità: {
    type: Number,
    min: 1,
    max: 5
  },
  puntualità: {
    type: Number,
    min: 1,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Un utente può recensire un altro utente una sola volta
reviewSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);