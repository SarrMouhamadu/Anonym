const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { askGemini } = require('../services/gemini');

// POST /api/chat — US-026: Chat avec Gemini
router.post('/', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis.' });

    // Custom prompt to maintain the Anonyme persona or context
    const fullPrompt = `Tu es l'assistant de modération et d'aide du réseau social 'Anonyme'. 
    Réponds de manière concise et aidante. Question: ${message}`;

    const reply = await askGemini(fullPrompt);

    res.json({ reply });
  } catch (error) {
    console.error('Erreur Gemini path:', error);
    res.status(500).json({ error: 'Erreur lors de la génération de réponse par IA.' });
  }
});

module.exports = router;
