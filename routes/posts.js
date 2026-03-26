const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/posts — US-008 & Performance: Pagination support
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await prisma.post.findMany({
      where: { status: 'VISIBLE' },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: { pseudo: true, role: true }
        },
        _count: {
          select: { comments: true, reactions: true }
        }
      }
    });

    // Formatting for anonymity
    const formattedPosts = posts.map(post => {
      const p = { ...post };
      if (p.isAnonymous) {
        p.user = { pseudo: 'Anonyme', role: 'MEMBER' };
      }
      return p;
    });

    res.json(formattedPosts);
  } catch (error) {
    console.error('Erreur get posts:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/posts — US-014: Publier un post
router.post('/', auth, async (req, res) => {
  try {
    const { content, isAnonymous } = req.body;
    if (!content) return res.status(400).json({ error: 'Le contenu est requis.' });

    const post = await prisma.post.create({
      data: {
        userId: req.user.id,
        content,
        isAnonymous: !!isAnonymous,
        status: 'VISIBLE'
      },
      include: {
        user: { select: { pseudo: true } }
      }
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Erreur create post:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /api/posts/:id — US-016 & US-017: Supprimer post
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) return res.status(404).json({ error: 'Post non trouvé.' });

    // Own post or Admin or PRO
    const isOwner = post.userId === req.user.id;
    const isMod = ['ADMIN', 'PRO'].includes(req.user.role);

    if (!isOwner && !isMod) {
      return res.status(403).json({ error: 'Action non autorisée.' });
    }

    await prisma.post.update({
      where: { id },
      data: { status: 'REMOVED' }
    });

    if (isMod && !isOwner && req.user.role === 'ADMIN') {
      await prisma.adminLog.create({
        data: {
          adminId: req.user.id,
          action: 'REMOVE_POST',
          targetType: 'POST',
          targetId: id,
          note: `Post supprimé par modération.`
        }
      });
    }

    res.json({ message: 'Post supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur delete post:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/posts/:id/react — US-020: Réagir à un post
router.post('/:id/react', auth, async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user.id;

    // Check post
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: 'Post non trouvé.' });

    // UPSERT or try-catch unique
    // Criteria: Contrainte @@unique([postId, userId])
    await prisma.reaction.create({
      data: { postId, userId }
    });

    res.status(201).json({ message: 'Réaction ajoutée.' });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Vous avez déjà réagi à ce post.' });
    console.error('Erreur add reaction:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /api/posts/:id/react — US-021: Retirer sa réaction
router.delete('/:id/react', auth, async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user.id;

    // Find and delete 
    // Reaction unique by [postId, userId]
    const reaction = await prisma.reaction.findUnique({
      where: { postId_userId: { postId, userId } }
    });

    if (!reaction) return res.status(404).json({ error: 'Réaction non trouvée.' });

    await prisma.reaction.delete({
      where: { id: reaction.id }
    });

    res.json({ message: 'Réaction retirée.' });
  } catch (error) {
    console.error('Erreur delete reaction:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;

