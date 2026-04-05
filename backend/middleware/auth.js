const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Prende il token dall'header Authorization
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token non fornito' });
    }

    // Verifica il token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Cerca l'utente
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    // Aggiunge l'utente alla richiesta
    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token non valido' });
  }
};

module.exports = auth;
