const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/users/:pseudo/profile — US-008 & US-009: Profil public
router.get('/:pseudo/profile', auth, async (req, res) => {
  try {
    const { pseudo } = req.params;
    const user = await prisma.user.findUnique({
      where: { pseudo },
      select: {
        id: true,
        pseudo: true,
        fullName: true,
        role: true,
        createdAt: true,
        posts: {
          where: { status: 'VISIBLE' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { 
            _count: { select: { reactions: true, comments: true } } 
          }
        }
      }
    });

    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé.' });

    // Formatting as per US-010: Hide fullName if not PRO
    const profile = { ...user };
    if (user.role !== 'PRO' && user.id !== req.user.id && req.user.role !== 'ADMIN') {
      delete profile.fullName;
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
