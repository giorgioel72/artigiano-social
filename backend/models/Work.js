const mongoose = require('mongoose');

const workSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Il titolo è obbligatorio'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'La descrizione è obbligatoria'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'La categoria è obbligatoria'],
    enum: ['muratura', 'idraulica', 'falegnameria', 'elettricità', 'imbiancatura', 'piastrelle', 'giardinaggio', 'altro']
  },
  images: [{
    type: String,
    default: []
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  luogo: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['completato', 'in corso', 'in progetto'],
    default: 'completato'
  },
  dataLavoro: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Work', workSchema);
