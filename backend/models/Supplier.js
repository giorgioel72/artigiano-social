const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Il nome del fornitore è obbligatorio'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'La categoria è obbligatoria'],
    enum: [
      'materiali edili',
      'idraulica',
      'elettricità',
      'ferramenta',
      'legno',
      'vernici',
      'piastrelle',
      'bagno',
      'giardinaggio',
      'altro'
    ]
  },
  description: {
    type: String,
    maxlength: 500
  },
  logo: {
    type: String,
    default: 'https://via.placeholder.com/150/2c3e50/e67e22?text=F'
  },
  indirizzo: {
    via: { type: String, required: true },
    città: { type: String, required: true },
    cap: String,
    coordinate: {
      lat: Number,
      lng: Number
    }
  },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' }
  },
  telefono: String,
  email: String,
  website: String,
  orario: {
    lunedi: String,
    martedi: String,
    mercoledi: String,
    giovedi: String,
    venerdi: String,
    sabato: String,
    domenica: String
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  recensioniCount: {
    type: Number,
    default: 0
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true  // ⭐ OBBLIGATORIO - solo utenti loggati!
  },
  verified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

supplierSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Supplier', supplierSchema);
