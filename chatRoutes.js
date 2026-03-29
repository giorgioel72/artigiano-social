const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
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
 * @route   GET /api/chat/conversations
 * @desc    Ottieni tutte le conversazioni dell'utente
 * @access  Private
 */
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId
    })
      .populate('participants', 'nome cognome avatar professione')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'nome cognome' }
      })
      .sort({ updatedAt: -1 });
    
    res.json(conversations);
  } catch (error) {
    console.error('Errore recupero conversazioni:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/chat/conversation/:userId
 * @desc    Ottieni o crea una conversazione con un altro utente
 * @access  Private
 */
router.get('/conversation/:userId', authMiddleware, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    
    // Verifica che l'altro utente esista
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    // Cerca conversazione esistente
    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, otherUserId] }
    }).populate('participants', 'nome cognome avatar professione');
    
    if (!conversation) {
      // Crea nuova conversazione
      conversation = new Conversation({
        participants: [req.userId, otherUserId]
      });
      await conversation.save();
      await conversation.populate('participants', 'nome cognome avatar professione');
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Errore recupero conversazione:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/chat/messages/:conversationId
 * @desc    Ottieni i messaggi di una conversazione
 * @access  Private
 */
router.get('/messages/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Verifica che l'utente partecipi alla conversazione
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.userId
    });
    
    if (!conversation) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }
    
    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'nome cognome avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Segna come letti i messaggi non propri
    await Message.updateMany(
      { 
        conversation: conversationId,
        sender: { $ne: req.userId },
        read: false
      },
      { read: true, $addToSet: { readBy: req.userId } }
    );
    
    res.json({
      messages: messages.reverse(),
      page,
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Errore recupero messaggi:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/chat/message
 * @desc    Invia un nuovo messaggio (via API)
 * @access  Private
 */
router.post('/message', authMiddleware, async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    
    // Verifica che l'utente partecipi alla conversazione
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.userId
    });
    
    if (!conversation) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }
    
    const message = new Message({
      conversation: conversationId,
      sender: req.userId,
      text,
      read: false
    });
    
    await message.save();
    await message.populate('sender', 'nome cognome avatar');
    
    // Aggiorna ultimo messaggio della conversazione
    conversation.lastMessage = message._id;
    conversation.updatedAt = Date.now();
    await conversation.save();
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Errore invio messaggio:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/chat/message/:messageId
 * @desc    Elimina un messaggio (solo proprio)
 * @access  Private
 */
router.delete('/message/:messageId', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Messaggio non trovato' });
    }
    
    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }
    
    await message.deleteOne();
    res.json({ message: 'Messaggio eliminato' });
  } catch (error) {
    console.error('Errore eliminazione messaggio:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/chat/conversation/:conversationId
 * @desc    Elimina una conversazione (tutti i messaggi)
 * @access  Private
 */
router.delete('/conversation/:conversationId', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      participants: req.userId
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversazione non trovata' });
    }
    
    // Elimina tutti i messaggi della conversazione
    await Message.deleteMany({ conversation: conversation._id });
    
    // Elimina la conversazione
    await conversation.deleteOne();
    
    res.json({ message: 'Conversazione eliminata' });
  } catch (error) {
    console.error('Errore eliminazione conversazione:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;