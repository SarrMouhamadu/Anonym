const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');
const { sendVerificationEmail } = require('../services/mailer');

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

    // Create user and token in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          phone,
          password: hashedPassword,
          fullName,
          pseudo,
        }
      });

      if (email) {
        const tokenValue = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Expiration 24h

        await tx.emailToken.create({
          data: {
            userId: user.id,
            token: tokenValue,
            expiresAt,
          }
        });

        // Send email (outside of transaction but after user check)
        // Wait till commit or handle error? Standard is after transaction or async
        return { user, tokenValue };
      }
      return { user, tokenValue: null };
    });

    if (email && result.tokenValue) {
      // Best practice: handle email sending failure asynchronously
      // For now we try-catch it
      try {
        await sendVerificationEmail(email, result.tokenValue);
      } catch (mailError) {
        console.error('Erreur envoi email verification:', mailError);
        // We still created the user, they can retry verification later if implemented
      }
    }

    res.status(201).json({ 
      message: email 
        ? 'Utilisateur créé. Vérifiez votre email pour activer votre compte.' 
        : 'Utilisateur créé (compte téléphone, non implémenté pour vérification).', 
      user: { id: result.user.id, pseudo: result.user.pseudo } 
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription.' });
  }
});

// GET /api/auth/verify-email?token=...
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token manquant.' });

    const emailToken = await prisma.emailToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!emailToken || emailToken.used || emailToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token invalide ou expiré.' });
    }

    // Mark as used and verify user email
    await prisma.$transaction([
      prisma.emailToken.update({
        where: { id: emailToken.id },
        data: { used: true }
      }),
      prisma.user.update({
        where: { id: emailToken.userId },
        data: { emailVerified: true }
      })
    ]);

    res.json({ message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.' });
  } catch (error) {
    console.error('Erreur verification email:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la vérification.' });
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

    // US-003 Criteria: emailVerified check
    if (user.email && !user.emailVerified) {
      return res.status(403).json({ error: 'Votre adresse email n\'est pas vérifiée.' });
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
