const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Genera token JWT
const generateToken = (userId) => {
  console.log('🎫 Generazione token per userId:', userId);
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// REGISTRAZIONE
router.post('/register', async (req, res) => {
  console.log('📝 REGISTRAZIONE - Ricevuta richiesta:', req.body.email);
  
  try {
    const { nome, cognome, email, password, professione } = req.body;

    // Verifica se l'email esiste già
    console.log('🔍 Verifico se email esiste già:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ Email già registrata:', email);
      return res.status(400).json({ error: 'Email già registrata' });
    }

    // Crea nuovo utente
    console.log('📝 Creazione nuovo utente:', email);
    const user = new User({
      nome,
      cognome,
      email,
      password,
      professione
    });

    await user.save();
    console.log('✅ Utente salvato con ID:', user._id);

    // Genera token
    const token = generateToken(user._id);

    console.log('✅ Registrazione completata per:', email);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        nome: user.nome,
        cognome: user.cognome,
        email: user.email,
        professione: user.professione,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Errore registrazione:', error);
    res.status(500).json({ error: error.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  console.log('📡 LOGIN - Richiesta ricevuta per:', req.body.email);
  
  try {
    const { email, password } = req.body;

    console.log('🔍 Cerco utente con email:', email);
    // Cerca utente (includi password per confronto)
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('❌ Utente non trovato per email:', email);
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    console.log('✅ Utente trovato:', user.nome, user.cognome);

    console.log('🔑 Verifico password...');
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log('❌ Password errata per:', email);
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    console.log('✅ Password corretta per:', email);

    console.log('🎫 Genero token...');
    const token = generateToken(user._id);
    console.log('✅ Token generato:', token.substring(0, 50) + '...');

    console.log('📦 Preparo risposta con dati utente');
    res.json({
      token,
      user: {
        id: user._id,
        nome: user.nome,
        cognome: user.cognome,
        email: user.email,
        professione: user.professione,
        avatar: user.avatar,
        role: user.role
      }
    });
    
    console.log('✅ Login completato per:', email);
    
  } catch (error) {
    console.error('❌ ERRORE LOGIN:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
