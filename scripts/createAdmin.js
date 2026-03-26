const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@anonyme.com';
  const pseudo = 'admin_root';
  const password = 'AdminPassword123!'; // À changer immédiatement
  const fullName = 'Administrateur Système';

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { pseudo }] }
  });

  if (existing) {
    console.log('Un compte admin avec cet email ou pseudo existe déjà.');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      email,
      pseudo,
      password: hashedPassword,
      fullName,
      role: 'ADMIN',
      emailVerified: true,
      status: 'ACTIVE'
    }
  });

  console.log('✅ Compte Admin créé avec succès !');
  console.log('Email:', email);
  console.log('Pseudo:', pseudo);
  console.log('Mot de passe:', password);
  console.log('--- VEUILLEZ SUPPRIMER CE SCRIPT APRÈS USAGE ---');
}

createAdmin()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
