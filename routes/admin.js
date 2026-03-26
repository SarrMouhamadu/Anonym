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

// US-030: Suspendre / bannir un compte
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status }
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: `CHANGE_STATUS_${status}`,
        targetType: 'USER',
        targetId: id,
        note: note || `Nouveau statut: ${status}`
      }
    });

    res.json({ message: 'Statut mis à jour.', user: { id: updatedUser.id, status: updatedUser.status } });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    console.error('Erreur admin change status:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// US-028 — Traiter un signalement (admin)
// GET /api/admin/reports — US-150: Consulter les signalements
router.get('/reports', async (req, res) => {
  try {
    const { status } = req.query; // PENDING, RESOLVED, DISMISSED
    const reports = await prisma.report.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { pseudo: true } },
        post: true,
        comment: true
      }
    });

    res.json(reports);
  } catch (error) {
    console.error('Erreur admin get reports:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PATCH /api/admin/reports/:id → RESOLVED ou DISMISSED
router.patch('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!['RESOLVED', 'DISMISSED'].includes(status)) {
      return res.status(400).json({ error: 'Action de signalement invalide.' });
    }

    const report = await prisma.report.update({
      where: { id },
      data: { 
        status,
        resolvedBy: req.user.id
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: `RESOLVE_REPORT_${status}`,
        targetType: 'REPORT',
        targetId: id,
        note: note || `Signalement traité: ${status}`
      }
    });

    res.json({ message: 'Signalement traité avec succès.', report });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Signalement non trouvé.' });
    console.error('Erreur admin resolve report:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// US-031 — Consulter les logs d'actions admin
router.get('/logs', async (req, res) => {
  try {
    const logs = await prisma.adminLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { pseudo: true } }
      }
    });
    res.json(logs);
  } catch (error) {
    console.error('Erreur admin get logs:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;

