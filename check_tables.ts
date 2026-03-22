import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.table.findMany({
    where: { restaurant: { slug: 'the-golden-spoon' } },
    select: { id: true, tableNumber: true }
  });
  console.log('Tables for The Golden Spoon:', tables);
  
  const superAdmins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN' },
    select: { email: true, name: true }
  });
  console.log('Super Admins:', superAdmins);
}

main().finally(() => prisma.$disconnect());
