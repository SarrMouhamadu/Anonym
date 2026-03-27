const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function reset() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.update({
    where: { email: 'admin@anonyme.com' },
    data: { 
        password: hash,
        status: 'ACTIVE',
        emailVerified: true
    }
  });
  console.log('✅ Mot de passe ADMIN réinitialisé à: admin123');
}

reset().finally(() => prisma.$disconnect());
