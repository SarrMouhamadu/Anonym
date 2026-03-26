const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/verifications — Demander le badge PRO
router.post('/', authenticateToken, async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Une raison est requise.' });

  try {
    const existing = await prisma.verificationRequest.findFirst({
        where: { userId: req.user.id, status: 'PENDING' }
    });
    if (existing) return res.status(400).json({ error: 'Une demande est déjà en cours.' });

    const request = await prisma.verificationRequest.create({
      data: {
        userId: req.user.id,
        reason,
        status: 'PENDING'
      }
    });
    res.json({ message: 'Demande envoyée avec succès !', request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/verifications/my — Voir le statut de ma demande
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const requests = await prisma.verificationRequest.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
