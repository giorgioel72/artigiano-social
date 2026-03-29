const mongoose = require('mongoose');

const workSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Il titolo è obbligatorio'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: [true, 'La descrizione è obbligatoria'],
    maxlength: 1000
  },
  category: {
    type: String,
    enum: ['muratura', 'idraulica', 'falegnameria', 'elettricità', 'imbiancatura', 'piastrelle', 'giardinaggio', 'altro'],
    required: true
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
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  luogo: {
    type: String,
    default: ''
  },
  dataLavoro: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['completato', 'in corso', 'in progetto'],
    default: 'completato'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Work', workSchema);