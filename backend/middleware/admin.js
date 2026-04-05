const adminMiddleware = async (req, res, next) => {
  try {
    // Il middleware auth deve essere eseguito prima
    if (!req.user) {
      return res.status(401).json({ error: 'Utente non autenticato' });
    }

    // Verifica che l'utente sia admin
    if (req.user.role !== 'admin') {
      console.log(`❌ Accesso negato: ${req.user.nome} (${req.user.role})`);
      return res.status(403).json({ error: 'Accesso negato. Richiesti privilegi di amministratore.' });
    }

    console.log(`✅ Accesso admin consentito: ${req.user.nome}`);
    next();
  } catch (error) {
    console.error('❌ Errore admin middleware:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = adminMiddleware;
