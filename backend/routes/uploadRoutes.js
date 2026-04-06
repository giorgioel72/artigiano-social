const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
    console.error('❌ Errore auth:', error);
    res.status(401).json({ error: 'Token non valido' });
  }
};

// Route di test
router.get('/test', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({ message: '✅ Upload routes funzionanti' });
});

// Upload multiple immagini
router.post('/images', authMiddleware, upload.array('images', 5), async (req, res) => {
  // ⭐ HEADER CORS ESPLICITI
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    console.log(`📸 Upload di ${req.files.length} immagini per lavori`);

    const uploadPreset = 'artigiano_social';
    const results = [];

    for (const file of req.files) {
      console.log(`⏳ Uploading: ${file.originalname}`);
      
      const result = await cloudinary.uploader.unsigned_upload(
        file.path,
        uploadPreset,
        {
          folder: 'artigiano-social/works'
        }
      );
      
      try { 
        fs.unlinkSync(file.path); 
        console.log(`🗑️ File temporaneo eliminato: ${file.path}`);
      } catch (e) {
        console.log(`⚠️ Impossibile eliminare ${file.path}:`, e.message);
      }
      
      console.log(`✅ Uploaded: ${result.secure_url}`);
      results.push({
        imageUrl: result.secure_url,
        publicId: result.public_id
      });
    }

    console.log(`✅ Tutti gli upload completati: ${results.length} immagini`);
    
    return res.status(200).json({
      success: true,
      images: results
    });

  } catch (error) {
    console.error('❌ Errore upload:', error);
    
    if (req.files) {
      req.files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (e) {}
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Upload avatar
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  // ⭐ HEADER CORS ESPLICITI
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    console.log('📸 Upload avatar:', req.file.originalname);

    const uploadPreset = 'artigiano_social';

    const result = await cloudinary.uploader.unsigned_upload(
      req.file.path,
      uploadPreset,
      {
        folder: 'artigiano-social/avatars'
      }
    );

    fs.unlinkSync(req.file.path);

    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatar: result.secure_url },
      { new: true }
    ).select('-password');

    console.log('✅ Avatar aggiornato:', result.secure_url);

    res.json({
      success: true,
      avatarUrl: result.secure_url,
      user
    });

  } catch (error) {
    console.error('❌ Errore upload avatar:', error);
    
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Upload singola immagine
router.post('/image', authMiddleware, upload.single('image'), async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    console.log('📸 Upload immagine:', req.file.originalname);

    const uploadPreset = 'artigiano_social';

    const result = await cloudinary.uploader.unsigned_upload(
      req.file.path,
      uploadPreset,
      {
        folder: 'artigiano-social/misc'
      }
    );

    fs.unlinkSync(req.file.path);

    console.log('✅ Immagine caricata:', result.secure_url);

    res.json({
      success: true,
      imageUrl: result.secure_url,
      publicId: result.public_id
    });

  } catch (error) {
    console.error('❌ Errore upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancella immagine da Cloudinary
router.post('/destroy', authMiddleware, async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  try {
    const { publicId } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ error: 'publicId richiesto' });
    }

    console.log(`🗑️ Cancellazione immagine: ${publicId}`);
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      console.log(`✅ Immagine cancellata: ${publicId}`);
      res.json({ success: true, result });
    } else {
      console.log(`⚠️ Immagine non trovata: ${publicId}`);
      res.json({ success: false, message: 'Immagine non trovata' });
    }
    
  } catch (error) {
    console.error('❌ Errore cancellazione:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
