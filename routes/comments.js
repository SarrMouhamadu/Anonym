const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

// POST /api/comments — US-018: Poster un commentaire
router.post('/', auth, async (req, res) => {
  try {
    const { postId, content, isAnonymous } = req.body;
    if (!postId || !content) return res.status(400).json({ error: 'postId et content sont requis.' });

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: 'Post non trouvé.' });

    const comment = await prisma.comment.create({
      data: {
        userId: req.user.id,
        postId,
        content,
        isAnonymous: !!isAnonymous,
        status: 'VISIBLE'
      },
      include: {
        user: { select: { pseudo: true } }
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Erreur create comment:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /api/comments/:id — US-019: Supprimer un commentaire
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment) return res.status(404).json({ error: 'Commentaire non trouvé.' });

    const isOwner = comment.userId === req.user.id;
    const isMod = ['ADMIN', 'PRO'].includes(req.user.role);

    if (!isOwner && !isMod) return res.status(403).json({ error: 'Action non autorisée.' });

    await prisma.comment.update({
      where: { id },
      data: { status: 'REMOVED' }
    });

    res.json({ message: 'Commentaire supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur delete comment:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/comments/post/:postId — Obtenir les commentaires d'un post
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await prisma.comment.findMany({
      where: { postId, status: 'VISIBLE' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { pseudo: true } }
      }
    });

    const formatted = comments.map(c => {
      const formattedC = { ...c };
      if (formattedC.isAnonymous) formattedC.user = { pseudo: 'Anonyme' };
      return formattedC;
    });

    res.json(formatted);
  } catch (error) {
    console.error('Erreur get comments:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
