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
// GET /api/admin/posts — US-156: Modération des contenus
router.get('/posts', adminOnly, async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: { user: { select: { pseudo: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(posts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/posts/:id — US-033: Suppression administrative avec log
router.delete('/posts/:id', adminOnly, async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  try {
    await prisma.post.delete({ where: { id } });
    
    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: 'DELETE_POST',
        targetType: 'POST',
        targetId: id,
        note: note || 'Suppression par modération'
      }
    });

    res.json({ message: 'Post supprimé et logué.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/verifications — US-169: Consulter les demandes de badge PRO
router.get('/verifications', adminOnly, async (req, res) => {
  try {
    const verifs = await prisma.verificationRequest.findMany({
      include: { user: { select: { pseudo: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(verifs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/verifications/:id — US-170: Approuver/Rejeter badge
router.patch('/verifications/:id', adminOnly, async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body; // RESOLVED, DISMISSED (from ReportStatus enum)

  try {
    const verif = await prisma.verificationRequest.update({
      where: { id },
      data: { status }
    });

    if (status === 'RESOLVED') {
      await prisma.user.update({
        where: { id: verif.userId },
        data: { role: 'PRO' }
      });
    }

    await prisma.adminLog.create({
      data: {
        adminId: req.user.id,
        action: status === 'RESOLVED' ? 'APPROVE_VERIFICATION' : 'REJECT_VERIFICATION',
        targetType: 'USER',
        targetId: verif.userId,
        note: note || `Décision de badge: ${status}`
      }
    });

    res.json({ message: 'Demande traitée.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/reports — US-150: Consulter les signalements
router.get('/reports', adminOnly, async (req, res) => {
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

