const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Il nome è obbligatorio'],
    trim: true
  },
  cognome: {
    type: String,
    required: [true, 'Il cognome è obbligatorio'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'L\'email è obbligatoria'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Inserisci un\'email valida']
  },
  password: {
    type: String,
    required: [true, 'La password è obbligatoria'],
    minlength: 6,
    select: false
  },
  professione: {
    type: String,
    enum: [
      'muratore', 'idraulico', 'falegname', 'elettricista', 'imbianchino',
      'piastrellista', 'giardiniere', 'pittore', 'serramentista', 'termoidraulico',
      'frigorista', 'fabbro', 'vetraio', 'tappezziere', 'restauratore',
      'marmista', 'posatore di pavimenti', 'cartongessista', 'coibentatore',
      'antennista', 'tecnico caldaie', 'tecnico climatizzazione', 'pulizie',
      'traslochi', 'altro'
    ],
    required: true
  },
  avatar: {
    type: String,
    default: 'https://via.placeholder.com/150/2c3e50/e67e22?text=AS'
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  telefono: {
    type: String,
    default: ''
  },
  città: {
    type: String,
    default: ''
  },
  indirizzo: {
    type: String,
    default: ''
  },
  sitoWeb: {
    type: String,
    default: ''
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
  lavoriCount: {
    type: Number,
    default: 0
  },
  dataNascita: {
    type: Date
  },
  privacy: {
    showEmail: { type: Boolean, default: false },
    showTelefono: { type: Boolean, default: false }
  },
  // ⭐ NUOVO CAMPO PER IL RUOLO ADMIN
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
