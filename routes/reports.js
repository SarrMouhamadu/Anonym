const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

// POST /api/reports — US-027: Signaler un contenu inapproprié
router.post('/', auth, async (req, res) => {
  try {
    const { targetType, postId, commentId, reason } = req.body;
    const reporterId = req.user.id;

    if (!targetType) return res.status(400).json({ error: 'targetType requis.' });

    // Validate if post or comment exists
    if (targetType === 'POST' && postId) {
      const p = await prisma.post.findUnique({ where: { id: postId } });
      if (!p) return res.status(404).json({ error: 'Post non trouvé.' });
    } else if (targetType === 'COMMENT' && commentId) {
      const c = await prisma.comment.findUnique({ where: { id: commentId } });
      if (!c) return res.status(404).json({ error: 'Commentaire non trouvé.' });
    } else {
      return res.status(400).json({ error: 'postId ou commentId requis selon le targetType.' });
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType,
        postId: targetType === 'POST' ? postId : null,
        commentId: targetType === 'COMMENT' ? commentId : null,
        reason,
        status: 'PENDING'
      }
    });

    res.status(201).json({ message: 'Signalement envoyé.', report });
  } catch (error) {
    console.error('Erreur send report:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
