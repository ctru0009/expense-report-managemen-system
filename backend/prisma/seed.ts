import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123456', 10);
  const userPassword = await bcrypt.hash('user123456', 10);

  await prisma.user.upsert({
    where: { email: 'admin@precisionledger.com' },
    update: {},
    create: {
      email: 'admin@precisionledger.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@precisionledger.com' },
    update: {},
    create: {
      email: 'user@precisionledger.com',
      password: userPassword,
      role: 'USER',
    },
  });

  console.log('Seed data created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
