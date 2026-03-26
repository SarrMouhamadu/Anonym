const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, fullName, pseudo } = req.body;

    if (!password || !fullName || !pseudo || (!email && !phone)) {
      return res.status(400).json({ error: 'Tous les champs obligatoires ne sont pas remplis.' });
    }

    // Checking uniqueness
    const existingPseudo = await prisma.user.findUnique({ where: { pseudo } });
    if (existingPseudo) return res.status(409).json({ error: 'Ce pseudo est déjà pris.' });

    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) return res.status(409).json({ error: 'Cet email est déjà pris.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        fullName,
        pseudo,
      }
    });

    res.status(201).json({ message: 'Utilisateur créé avec succès.', user: { id: user.id, pseudo: user.pseudo } });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body; // login can be email or pseudo

    if (!login || !password) {
      return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
    }

    // Find user by email or pseudo
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: login },
          { pseudo: login }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Ce compte est suspendu ou banni.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const token = jwt.sign(
      { id: user.id, pseudo: user.pseudo, role: user.role },
      process.env.JWT_SECRET || 'secret_temporaire',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Connexion réussie.',
      token,
      user: { id: user.id, pseudo: user.pseudo, role: user.role, fullName: user.fullName }
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion.' });
  }
});

module.exports = router;
