import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: 'demo' },
  });
  console.log('Restaurant "demo":', restaurant);
  
  const allRestaurants = await prisma.restaurant.findMany({
    select: { slug: true, name: true, isActive: true }
  });
  console.log('All restaurants:', allRestaurants);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
