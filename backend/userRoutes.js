const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware di autenticazione
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token non fornito' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    console.error('Errore auth:', error);
    res.status(401).json({ error: 'Token non valido' });
  }
};

/**
 * @route   GET /api/users/search/query
 * @desc    Cerca utenti per nome, cognome, professione
 * @access  Public
 */
router.get('/search/query', async (req, res) => {
  try {
    const { q } = req.query;
    
    console.log('🔍 Ricerca utenti:', q);
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const users = await User.find({
      $or: [
        { nome: { $regex: q, $options: 'i' } },
        { cognome: { $regex: q, $options: 'i' } },
        { professione: { $regex: q, $options: 'i' } }
      ]
    })
      .select('nome cognome professione avatar città privacy')
      .limit(10);
    
    // Nascondi email e telefono (non dovrebbero essere nella ricerca comunque)
    const usersResponse = users.map(user => {
      const userObj = user.toObject();
      // Non includiamo email e telefono nei risultati di ricerca
      delete userObj.email;
      delete userObj.telefono;
      return userObj;
    });
    
    console.log(`✅ Trovati ${usersResponse.length} utenti`);
    res.json(usersResponse);
  } catch (error) {
    console.error('❌ Errore ricerca utenti:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/users
 * @desc    Ottieni tutti gli utenti (escluso se stesso)
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } })
      .select('nome cognome professione avatar bio città')
      .sort({ nome: 1 });
    
    res.json(users);
  } catch (error) {
    console.error('❌ Errore recupero utenti:', error);
    res.status(500).json({ error: 'Errore nel recupero degli utenti' });
  }
});

/**
 * @route   GET /api/users/me
 * @desc    Ottieni il profilo dell'utente corrente
 * @access  Private
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    console.error('❌ Errore recupero profilo:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Ottieni profilo di un altro utente (pubblico)
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -__v -updatedAt');
    
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    // Prepara l'oggetto da restituire
    const userResponse = user.toObject();
    
    // Se l'utente NON ha autorizzato la visualizzazione dell'email, la nascondiamo
    if (!user.privacy || !user.privacy.showEmail) {
      userResponse.email = '🔒 Privato';
    }
    
    // Se l'utente NON ha autorizzato la visualizzazione del telefono, lo nascondiamo
    if (!user.privacy || !user.privacy.showTelefono) {
      userResponse.telefono = '🔒 Privato';
    }
    
    res.json(userResponse);
  } catch (error) {
    console.error('❌ Errore recupero utente:', error);
    res.status(500).json({ error: 'Errore nel recupero dell\'utente' });
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Aggiorna il profilo dell'utente corrente
 * @access  Private
 */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { nome, cognome, bio, telefono, città, indirizzo, sitoWeb, professione, privacy } = req.body;
    
    // Costruisci oggetto con solo i campi da aggiornare
    const updateData = {};
    if (nome) updateData.nome = nome;
    if (cognome) updateData.cognome = cognome;
    if (bio !== undefined) updateData.bio = bio;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (città !== undefined) updateData.città = città;
    if (indirizzo !== undefined) updateData.indirizzo = indirizzo;
    if (sitoWeb !== undefined) updateData.sitoWeb = sitoWeb;
    if (professione) updateData.professione = professione;
    if (privacy) updateData.privacy = privacy;

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    res.json({
      message: '✅ Profilo aggiornato con successo',
      user
    });
  } catch (error) {
    console.error('❌ Errore aggiornamento profilo:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/users/password
 * @desc    Cambia la password dell'utente corrente
 * @access  Private
 */
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Verifica che la nuova password sia valida
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'La nuova password deve essere di almeno 6 caratteri' 
      });
    }

    // Prendi utente con password
    const user = await User.findById(req.userId).select('+password');
    
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Verifica password attuale
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Password attuale non corretta' });
    }

    // Aggiorna password
    user.password = newPassword;
    await user.save();

    res.json({ message: '✅ Password aggiornata con successo' });
  } catch (error) {
    console.error('❌ Errore cambio password:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/users/avatar
 * @desc    Aggiorna l'avatar dell'utente (URL)
 * @access  Private
 */
router.post('/avatar', authMiddleware, async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    
    if (!avatarUrl) {
      return res.status(400).json({ error: 'URL avatar non fornito' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    res.json({
      message: '✅ Avatar aggiornato con successo',
      avatar: user.avatar,
      user
    });
  } catch (error) {
    console.error('❌ Errore aggiornamento avatar:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/users/account
 * @desc    Elimina l'account dell'utente corrente
 * @access  Private
 */
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.userId);
    
    res.json({ message: '✅ Account eliminato con successo' });
  } catch (error) {
    console.error('❌ Errore eliminazione account:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
