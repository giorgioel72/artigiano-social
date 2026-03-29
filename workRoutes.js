const express = require('express');
const router = express.Router();
const Work = require('../models/Work');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const cloudinary = require('../config/cloudinary');

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
    console.log('🔑 Utente autenticato:', user.nome, 'ID:', user._id.toString());
    next();
  } catch (error) {
    console.error('❌ Errore auth:', error);
    res.status(401).json({ error: 'Token non valido' });
  }
};

/**
 * @route   GET /api/works/search/query
 * @desc    Cerca lavori per titolo, descrizione, categoria, autore, luogo
 * @access  Public
 */
router.get('/search/query', async (req, res) => {
  try {
    const { q } = req.query;
    
    console.log('🔍 Ricerca lavori:', q);
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const authors = await User.find({
      $or: [
        { nome: { $regex: q, $options: 'i' } },
        { cognome: { $regex: q, $options: 'i' } }
      ]
    }).select('_id');
    
    const authorIds = authors.map(a => a._id);

    const works = await Work.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { luogo: { $regex: q, $options: 'i' } },
        { author: { $in: authorIds } }
      ]
    })
      .populate('author', 'nome cognome professione avatar')
      .populate('comments.user', 'nome cognome avatar')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`✅ Trovati ${works.length} lavori`);
    res.json(works);
  } catch (error) {
    console.error('❌ Errore ricerca lavori:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/works
 * @desc    Ottieni tutti i lavori (con autore)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const works = await Work.find()
      .populate('author', 'nome cognome avatar professione')
      .populate('comments.user', 'nome cognome avatar')
      .sort({ createdAt: -1 });
    
    res.json(works);
  } catch (error) {
    console.error('❌ Errore recupero lavori:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/works/user/:userId
 * @desc    Ottieni lavori di un utente specifico
 * @access  Public
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const works = await Work.find({ author: req.params.userId })
      .populate('author', 'nome cognome avatar professione')
      .populate('comments.user', 'nome cognome avatar')
      .sort({ createdAt: -1 });
    
    res.json(works);
  } catch (error) {
    console.error('❌ Errore recupero lavori utente:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/works/:id
 * @desc    Ottieni un singolo lavoro
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id)
      .populate('author', 'nome cognome avatar professione')
      .populate('comments.user', 'nome cognome avatar');
    
    if (!work) {
      return res.status(404).json({ error: 'Lavoro non trovato' });
    }
    
    res.json(work);
  } catch (error) {
    console.error('❌ Errore recupero lavoro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/works
 * @desc    Crea un nuovo lavoro
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, category, images, luogo, dataLavoro, status } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Titolo, descrizione e categoria sono obbligatori' });
    }

    const work = new Work({
      title,
      description,
      category,
      images: images || [],
      luogo: luogo || '',
      dataLavoro: dataLavoro || Date.now(),
      status: status || 'completato',
      author: req.userId
    });

    await work.save();
    
    await User.findByIdAndUpdate(req.userId, {
      $inc: { lavoriCount: 1 }
    });

    await work.populate('author', 'nome cognome avatar professione');

    console.log(`✅ Lavoro creato: ${work.title} da ${req.user.nome}`);
    res.status(201).json(work);
  } catch (error) {
    console.error('❌ Errore creazione lavoro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/works/:id
 * @desc    Modifica un lavoro (solo autore)
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    
    if (!work) {
      return res.status(404).json({ error: 'Lavoro non trovato' });
    }

    // Log dettagliati per debug
    console.log('🔍 Tentativo modifica lavoro:', work.title);
    console.log('- work.author (ObjectId):', work.author);
    console.log('- work.author toString():', work.author.toString());
    console.log('- req.userId:', req.userId);
    console.log('- req.userId type:', typeof req.userId);
    console.log('- req.user? nome:', req.user?.nome);

    // Confronto robusto
    const authorId = work.author.toString();
    const userId = req.userId.toString();
    
    if (authorId !== userId) {
      console.log('❌ Autorizzazione negata - ID non corrispondono');
      return res.status(403).json({ error: 'Non autorizzato a modificare questo lavoro' });
    }

    console.log('✅ Autorizzazione concessa');

    const { title, description, category, images, luogo, status } = req.body;
    
    // Gestione immagini vecchie vs nuove
    if (images && work.images) {
      const imagesToDelete = work.images.filter(oldImg => !images.includes(oldImg));
      
      if (imagesToDelete.length > 0) {
        console.log(`🖼️ Eliminazione di ${imagesToDelete.length} immagini obsolete da Cloudinary...`);
        for (const imageUrl of imagesToDelete) {
          try {
            const parts = imageUrl.split('/');
            const filename = parts[parts.length - 1];
            const folder = parts[parts.length - 2];
            const publicId = `${folder}/${filename.split('.')[0]}`;
            
            await cloudinary.uploader.destroy(publicId);
            console.log(`✅ Immagine eliminata da Cloudinary: ${publicId}`);
          } catch (err) {
            console.error('❌ Errore eliminazione immagine:', err);
          }
        }
      }
    }
    
    if (title) work.title = title;
    if (description) work.description = description;
    if (category) work.category = category;
    if (images) work.images = images;
    if (luogo) work.luogo = luogo;
    if (status) work.status = status;

    await work.save();
    await work.populate('author', 'nome cognome avatar professione');
    
    console.log(`✅ Lavoro modificato: ${work.title}`);
    res.json(work);
    
  } catch (error) {
    console.error('❌ Errore modifica lavoro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/works/:id
 * @desc    Elimina un lavoro (solo autore) e le immagini associate
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    
    if (!work) {
      return res.status(404).json({ error: 'Lavoro non trovato' });
    }

    // Log dettagliati per debug
    console.log('🔍 Tentativo eliminazione lavoro:', work.title);
    console.log('- work.author (ObjectId):', work.author);
    console.log('- work.author toString():', work.author.toString());
    console.log('- req.userId:', req.userId);
    console.log('- req.userId type:', typeof req.userId);
    console.log('- req.user? nome:', req.user?.nome);

    // Confronto robusto
    const authorId = work.author.toString();
    const userId = req.userId.toString();
    
    if (authorId !== userId) {
      console.log('❌ Autorizzazione negata - ID non corrispondono');
      return res.status(403).json({ error: 'Non autorizzato a eliminare questo lavoro' });
    }

    console.log('✅ Autorizzazione concessa');

    // ELIMINA LE IMMAGINI DA CLOUDINARY
    if (work.images && work.images.length > 0) {
      console.log(`🖼️ Eliminazione di ${work.images.length} immagini da Cloudinary...`);
      for (const imageUrl of work.images) {
        try {
          const parts = imageUrl.split('/');
          const filename = parts[parts.length - 1];
          const folder = parts[parts.length - 2];
          const publicId = `${folder}/${filename.split('.')[0]}`;
          
          await cloudinary.uploader.destroy(publicId);
          console.log(`✅ Immagine eliminata da Cloudinary: ${publicId}`);
        } catch (err) {
          console.error('❌ Errore eliminazione immagine:', err);
        }
      }
    }

    await work.deleteOne();
    
    // Decrementa contatore lavori dell'utente
    await User.findByIdAndUpdate(req.userId, {
      $inc: { lavoriCount: -1 }
    });
    
    console.log(`✅ Lavoro eliminato: ${work.title}`);
    res.json({ message: 'Lavoro e immagini eliminati con successo' });
    
  } catch (error) {
    console.error('❌ Errore eliminazione lavoro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/works/:id/like
 * @desc    Metti o togli like a un lavoro
 * @access  Private
 */
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    
    if (!work) {
      return res.status(404).json({ error: 'Lavoro non trovato' });
    }

    const likeIndex = work.likes.indexOf(req.userId);
    
    if (likeIndex === -1) {
      work.likes.push(req.userId);
      console.log(`❤️ Like aggiunto da ${req.user.nome} a ${work.title}`);
    } else {
      work.likes.splice(likeIndex, 1);
      console.log(`💔 Like rimosso da ${req.user.nome} a ${work.title}`);
    }

    await work.save();
    
    res.json({ 
      likes: work.likes.length,
      userLiked: likeIndex === -1
    });
  } catch (error) {
    console.error('❌ Errore like:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/works/:id/comment
 * @desc    Aggiungi un commento a un lavoro
 * @access  Private
 */
router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Il commento non può essere vuoto' });
    }

    const work = await Work.findById(req.params.id);
    
    if (!work) {
      return res.status(404).json({ error: 'Lavoro non trovato' });
    }

    work.comments.push({
      user: req.userId,
      text: text.trim()
    });

    await work.save();
    await work.populate('comments.user', 'nome cognome avatar');
    
    const newComment = work.comments[work.comments.length - 1];
    
    console.log(`💬 Commento aggiunto da ${req.user.nome} a ${work.title}`);
    res.status(201).json(newComment);
  } catch (error) {
    console.error('❌ Errore commento:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/works/:workId/comment/:commentId
 * @desc    Elimina un commento (solo autore del commento o autore del lavoro)
 * @access  Private
 */
router.delete('/:workId/comment/:commentId', authMiddleware, async (req, res) => {
  try {
    const work = await Work.findById(req.params.workId);
    
    if (!work) {
      return res.status(404).json({ error: 'Lavoro non trovato' });
    }

    const comment = work.comments.id(req.params.commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Commento non trovato' });
    }

    console.log('🔍 Tentativo eliminazione commento:');
    console.log('- comment.user:', comment.user);
    console.log('- req.userId:', req.userId);
    console.log('- work.author:', work.author);

    // Verifica che l'utente sia l'autore del commento o l'autore del lavoro
    if (comment.user.toString() !== req.userId && work.author.toString() !== req.userId) {
      console.log('❌ Autorizzazione negata per eliminazione commento');
      return res.status(403).json({ error: 'Non autorizzato a eliminare questo commento' });
    }

    comment.deleteOne();
    await work.save();
    
    console.log(`✅ Commento eliminato da ${work.title}`);
    res.json({ message: 'Commento eliminato con successo' });
    
  } catch (error) {
    console.error('❌ Errore eliminazione commento:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;