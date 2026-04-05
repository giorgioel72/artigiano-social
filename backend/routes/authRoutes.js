const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Genera token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// REGISTRAZIONE
router.post('/register', async (req, res) => {
  try {
    const { nome, cognome, email, password, professione } = req.body;

    // Verifica se l'email esiste già
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email già registrata' });
    }

    // Crea nuovo utente
    const user = new User({
      nome,
      cognome,
      email,
      password,
      professione
    });

    await user.save();

    // Genera token
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        nome: user.nome,
        cognome: user.cognome,
        email: user.email,
        professione: user.professione,
        avatar: user.avatar,
        role: user.role  // ⭐ AGGIUNTO CAMPO ROLE
      }
    });
  } catch (error) {
    console.error('Errore registrazione:', error);
    res.status(500).json({ error: error.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Cerca utente (includi password per confronto)
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Verifica password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Genera token
    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        nome: user.nome,
        cognome: user.cognome,
        email: user.email,
        professione: user.professione,
        avatar: user.avatar,
        role: user.role  // ⭐ AGGIUNTO CAMPO ROLE
      }
    });
  } catch (error) {
    console.error('Errore login:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
