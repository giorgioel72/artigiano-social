const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const axios = require('axios');

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

// Funzione per geocoding
async function geocodeAddress(indirizzo) {
  try {
    const addressStr = `${indirizzo.via}, ${indirizzo.città}${indirizzo.cap ? ', ' + indirizzo.cap : ''}`;
    
    const response = await axios.get(
      'https://nominatim.openstreetmap.org/search',
      {
        params: {
          q: addressStr,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'ArtigianoSocial/1.0'
        }
      }
    );

    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      return {
        lat: parseFloat(lat),
        lng: parseFloat(lon),
        coordinates: [parseFloat(lon), parseFloat(lat)]
      };
    }
    return null;
  } catch (error) {
    console.error('❌ Errore geocoding:', error);
    return null;
  }
}

// GET tutti i fornitori (con filtro opzionale)
router.get('/', async (req, res) => {
  try {
    const { category, città } = req.query;
    let query = {};
    
    if (category) query.category = category;
    if (città) query['indirizzo.città'] = { $regex: città, $options: 'i' };
    
    const suppliers = await Supplier.find(query)
      .populate('addedBy', 'nome cognome')
      .sort({ createdAt: -1 });
    
    res.json(suppliers);
  } catch (error) {
    console.error('❌ Errore recupero fornitori:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET fornitori vicini
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, maxDistance = 10000, category } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitudine e longitudine richieste' });
    }

    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    };

    if (category) {
      query.category = category;
    }

    const suppliers = await Supplier.find(query)
      .populate('addedBy', 'nome cognome')
      .limit(50);

    res.json(suppliers);
  } catch (error) {
    console.error('❌ Errore ricerca fornitori vicini:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET singolo fornitore
router.get('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate('addedBy', 'nome cognome');
    
    if (!supplier) {
      return res.status(404).json({ error: 'Fornitore non trovato' });
    }
    
    res.json(supplier);
  } catch (error) {
    console.error('❌ Errore recupero fornitore:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST nuovo fornitore (SOLO UTENTI LOGGATI)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, category, description, indirizzo, telefono, email, website, orario } = req.body;

    if (!name || !category || !indirizzo?.via || !indirizzo?.città) {
      return res.status(400).json({ 
        error: 'Nome, categoria, via e città sono obbligatori' 
      });
    }

    const geoData = await geocodeAddress(indirizzo);
    
    if (!geoData) {
      return res.status(400).json({ 
        error: 'Impossibile trovare le coordinate per l\'indirizzo fornito' 
      });
    }

    const supplier = new Supplier({
      name,
      category,
      description,
      indirizzo: {
        ...indirizzo,
        coordinate: {
          lat: geoData.lat,
          lng: geoData.lng
        }
      },
      location: {
        type: 'Point',
        coordinates: geoData.coordinates
      },
      telefono,
      email,
      website,
      orario,
      addedBy: req.userId  // ⭐ PRESO DAL TOKEN - OBBLIGATORIO
    });

    await supplier.save();
    await supplier.populate('addedBy', 'nome cognome');
    
    console.log(`✅ Fornitore aggiunto: ${name} da ${req.user.nome}`);
    res.status(201).json(supplier);
    
  } catch (error) {
    console.error('❌ Errore creazione fornitore:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT modifica fornitore (solo proprietario)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ error: 'Fornitore non trovato' });
    }

    if (supplier.addedBy.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Non autorizzato a modificare questo fornitore' });
    }

    const { name, category, description, indirizzo, telefono, email, website, orario } = req.body;
    
    if (indirizzo) {
      const geoData = await geocodeAddress(indirizzo);
      if (geoData) {
        supplier.indirizzo = {
          ...indirizzo,
          coordinate: {
            lat: geoData.lat,
            lng: geoData.lng
          }
        };
        supplier.location = {
          type: 'Point',
          coordinates: geoData.coordinates
        };
      }
    }
    
    if (name) supplier.name = name;
    if (category) supplier.category = category;
    if (description !== undefined) supplier.description = description;
    if (telefono !== undefined) supplier.telefono = telefono;
    if (email !== undefined) supplier.email = email;
    if (website !== undefined) supplier.website = website;
    if (orario) supplier.orario = orario;

    await supplier.save();
    
    console.log(`✅ Fornitore modificato: ${supplier.name}`);
    res.json(supplier);
    
  } catch (error) {
    console.error('❌ Errore modifica fornitore:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE fornitore (solo proprietario) - VERSIONE CORRETTA
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ error: 'Fornitore non trovato' });
    }

    console.log('🔍 Tentativo eliminazione fornitore:', supplier.name);
    console.log('- addedBy (proprietario):', supplier.addedBy);
    console.log('- addedBy type:', typeof supplier.addedBy);
    console.log('- addedBy toString():', supplier.addedBy.toString());
    console.log('- req.userId:', req.userId);
    console.log('- req.userId type:', typeof req.userId);
    console.log('- req.userId toString():', req.userId.toString());

    // ⭐ CONFRONTO ROBUSTO - USANDO toString() SU ENTRAMBI
    if (supplier.addedBy.toString() !== req.userId.toString()) {
      console.log('❌ Autorizzazione negata - ID non corrispondono');
      return res.status(403).json({ error: 'Non autorizzato a eliminare questo fornitore' });
    }

    await supplier.deleteOne();
    
    console.log(`✅ Fornitore eliminato: ${supplier.name}`);
    res.json({ message: 'Fornitore eliminato con successo' });
    
  } catch (error) {
    console.error('❌ Errore eliminazione fornitore:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;