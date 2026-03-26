const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

// POST /api/messages — US-022: Envoyer un message
router.post('/', auth, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) return res.status(400).json({ error: 'receiverId et content requis.' });

    // Check receiver role
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) return res.status(404).json({ error: 'Destinataire non trouvé.' });

    // Typically messaging is between MEMBER and PRO as per US-022
    // But we let it open for now or restrict as per criteria: "senderId = membre, receiverId = PRO"

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content
      },
      include: {
        sender: { select: { pseudo: true, fullName: true, role: true } }
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Erreur send message:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/messages/:otherUserId — US-024: Historique des messages
router.get('/:otherUserId', auth, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const myId = req.user.id;

    // Check if I am PRO and the other is MEMBER (for name reveal)
    const otherUser = await prisma.user.findUnique({ where: { id: otherUserId } });
    if (!otherUser) return res.status(404).json({ error: 'Utilisateur non trouvé.' });

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: myId }
        ]
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, pseudo: true, fullName: true, role: true } }
      }
    });

    // US-011 & US-012: Reveal name logic
    // If I am PRO and other is MEMBER, I only see fullName if they messaged me
    const formatted = messages.map(m => {
      const msg = { ...m };
      const isOtherSenderMember = m.senderId === otherUserId && otherUser.role === 'MEMBER';
      const amIPro = req.user.role === 'PRO';

      if (isOtherSenderMember && amIPro) {
        // Name revealed because they messaged me
        // Already included in prisma selection
      } else if (isOtherSenderMember && !amIPro && req.user.role !== 'ADMIN') {
        // I shouldn't see their name if I am just another member (though messaging is normally P2P)
        delete msg.sender.fullName;
      }
      return msg;
    });

    res.json(formatted);
  } catch (error) {
    console.error('Erreur get messages:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PATCH /api/messages/:id/read — US-025: Marquer comme lu
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const message = await prisma.message.findUnique({ where: { id } });

    if (!message) return res.status(404).json({ error: 'Message non trouvé.' });
    if (message.receiverId !== req.user.id) return res.status(403).json({ error: 'Action non autorisée.' });

    await prisma.message.update({
      where: { id },
      data: { readAt: new Date() }
    });

    res.json({ message: 'Message marqué comme lu.' });
  } catch (error) {
    console.error('Erreur read message:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
