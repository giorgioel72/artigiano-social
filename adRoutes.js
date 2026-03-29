const express = require('express');
const router = express.Router();
const Advertisement = require('../models/Advertisement');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
// const adminMiddleware = require('../middleware/admin'); // ⭐ COMMENTATO PER TEST

// GET pubblicità per una specifica vetrina (PUBBLICO - no auth)
router.get('/placement/:placement', async (req, res) => {
  try {
    const { placement } = req.params;
    const { limit = 3 } = req.query;
    
    const ads = await Advertisement.find({
      placement,
      status: 'active'
    })
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit));
    
    for (const ad of ads) {
      ad.impressions += 1;
      await ad.save();
    }
    
    res.json(ads);
  } catch (error) {
    console.error('❌ Errore recupero pubblicità:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET tutte le pubblicità (solo admin) - ⭐ RIMOSSO adminMiddleware
router.get('/', authMiddleware, async (req, res) => {
  try {
    const ads = await Advertisement.find()
      .populate('createdBy', 'nome cognome')
      .sort({ createdAt: -1 });
    
    res.json(ads);
  } catch (error) {
    console.error('❌ Errore recupero pubblicità:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET singola pubblicità (pubblica)
router.get('/:id', async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id)
      .populate('createdBy', 'nome cognome');
    
    if (!ad) {
      return res.status(404).json({ error: 'Pubblicità non trovata' });
    }
    
    res.json(ad);
  } catch (error) {
    console.error('❌ Errore recupero pubblicità:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST nuova pubblicità (solo admin) - ⭐ RIMOSSO adminMiddleware
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, imageUrl, linkUrl, placement, status, priority } = req.body;
    
    if (!title || !imageUrl || !linkUrl || !placement) {
      return res.status(400).json({ 
        error: 'Titolo, immagine, link e posizione sono obbligatori' 
      });
    }
    
    const ad = new Advertisement({
      title,
      description,
      imageUrl,
      linkUrl,
      placement,
      status: status || 'active',
      priority: priority || 0,
      createdBy: req.userId
    });
    
    await ad.save();
    await ad.populate('createdBy', 'nome cognome');
    
    console.log(`✅ Pubblicità creata: ${title} da ${req.user.nome}`);
    res.status(201).json(ad);
    
  } catch (error) {
    console.error('❌ Errore creazione pubblicità:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT modifica pubblicità (solo admin) - ⭐ RIMOSSO adminMiddleware
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({ error: 'Pubblicità non trovata' });
    }
    
    const { title, description, imageUrl, linkUrl, placement, status, priority } = req.body;
    
    if (title) ad.title = title;
    if (description !== undefined) ad.description = description;
    if (imageUrl) ad.imageUrl = imageUrl;
    if (linkUrl) ad.linkUrl = linkUrl;
    if (placement) ad.placement = placement;
    if (status) ad.status = status;
    if (priority !== undefined) ad.priority = priority;
    
    await ad.save();
    
    console.log(`✅ Pubblicità modificata: ${ad.title}`);
    res.json(ad);
    
  } catch (error) {
    console.error('❌ Errore modifica pubblicità:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE pubblicità (solo admin) - ⭐ RIMOSSO adminMiddleware
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({ error: 'Pubblicità non trovata' });
    }

    console.log(`🗑️ Eliminazione pubblicità: ${ad.title}`);
    await ad.deleteOne();
    
    console.log(`✅ Pubblicità eliminata: ${ad.title}`);
    res.json({ message: 'Pubblicità eliminata con successo' });
    
  } catch (error) {
    console.error('❌ Errore eliminazione pubblicità:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST traccia click (pubblico)
router.post('/:id/click', async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({ error: 'Pubblicità non trovata' });
    }
    
    ad.clicks += 1;
    await ad.save();
    
    res.json({ clicks: ad.clicks });
    
  } catch (error) {
    console.error('❌ Errore tracciamento click:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;