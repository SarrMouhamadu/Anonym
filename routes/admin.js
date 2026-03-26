const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const prisma = new PrismaClient();

// All routes here are protected
router.use(auth);
router.use(adminOnly);

// PATCH /api/admin/users/:id/role
// US-006: Promotion vers PRO
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, note } = req.body;

    if (!['MEMBER', 'PRO', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role }
    });

    // US-006: Action loguée dans AdminLog
    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: `CHANGE_ROLE_${role}`,
        targetType: 'USER',
        targetId: id,
        note: note || `Nouveau rôle: ${role}`
      }
    });

    res.json({ message: 'Rôle mis à jour avec succès.', user: { id: updatedUser.id, pseudo: updatedUser.pseudo, role: updatedUser.role } });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    console.error('Erreur admin change role:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// US-029: Voir tous les utilisateurs
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        pseudo: true,
        role: true,
        status: true,
        createdAt: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Erreur admin get users:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
