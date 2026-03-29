const Work = require('../models/Work');
const User = require('../models/User');

// GET tutti i lavori (con autore)
exports.getAllWorks = async (req, res) => {
  try {
    const works = await Work.find()
      .populate('author', 'nome cognome avatar professione')
      .populate('comments.user', 'nome cognome avatar')
      .sort({ createdAt: -1 }); // Più recenti prima
    
    res.json(works);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET lavori di un utente specifico
exports.getUserWorks = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const works = await Work.find({ author: userId })
      .populate('author', 'nome cognome avatar')
      .sort({ createdAt: -1 });
    
    res.json(works);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET singolo lavoro
exports.getWorkById = async (req, res) => {
  try {
    const work = await Work.findById(req.params.id)
      .populate('author', 'nome cognome avatar professione')
      .populate('comments.user', 'nome cognome avatar');
    
    if (!work) {
      return res.status(404).json({ error: 'Lavoro non trovato' });
    }
    
    res.json(work);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST nuovo lavoro (protetta)
exports.createWork = async (req, res) => {
  try {
    const { title, description, category, images } = req.body;

    const work = new Work({
      title,
      description,
      category,
      images: images || [],
      author: req.userId // Prendiamo l'ID dal token
    });

    await work.save();
    
    // Popola i dati dell'autore
    await work.populate('author', 'nome cognome avatar');

    res.status(201).json(work);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT modifica lavoro (solo autore)
exports.updateWork = async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    
    if (!work) {
      return res.status(404).json({ error: 'Lavoro non trovato' });
    }

    // Verifica che sia l'autore
    if (work.author.toString() !== req.userId) {
      return res.status(403).json({ error: 'Non autorizzato a modificare questo lavoro' });
    }

    // Aggiorna i campi
    const { title, description, category, images } = req.body;
    if (title) work.title = title;
    if (description) work.description = description;
    if (category) work.category = category;
    if (images) work.images = images;

    await work.save();
    
    res.json(work);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE lavoro (solo autore)
exports.deleteWork = async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    
    if (!work) {
      return res.status(404).json({ error: 'Lavoro non trovato' });
    }

    if (work.author.toString() !== req.userId) {
      return res.status(403).json({ error: 'Non autorizzato a eliminare questo lavoro' });
    }

    await work.deleteOne();
    
    res.json({ message: 'Lavoro eliminato con successo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LIKE / UNLIKE lavoro
exports.toggleLike = async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    
    if (!work) {
      return res.status(404).json({ error: 'Lavoro non trovato' });
    }

    // Verifica se l'utente ha già messo like
    const likeIndex = work.likes.indexOf(req.userId);
    
    if (likeIndex === -1) {
      // Aggiungi like
      work.likes.push(req.userId);
    } else {
      // Rimuovi like
      work.likes.splice(likeIndex, 1);
    }

    await work.save();
    
    res.json({ 
      likes: work.likes.length,
      userLiked: likeIndex === -1 // true se ha appena messo like
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// COMMENTA lavoro
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Il commento non può essere vuoto' });
    }

    const work = await Work.findById(req.params.id);
    
    if (!work) {
      return res.status(404).json({ error: 'Lavoro non trovato' });
    }

    work.comments.push({
      user: req.userId,
      text
    });

    await work.save();
    
    // Popola il nuovo commento con i dati dell'utente
    await work.populate('comments.user', 'nome cognome avatar');
    
    // Prendi l'ultimo commento aggiunto
    const newComment = work.comments[work.comments.length - 1];
    
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};