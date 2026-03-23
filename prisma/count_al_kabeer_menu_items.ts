import { prisma } from '../src/config/database';

async function main() {
  const query = 'al kabeer';

  const restaurants = await prisma.restaurant.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query.replace(/\s+/g, '-'), mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, slug: true },
    take: 10,
  });

  if (restaurants.length === 0) {
    console.log(`No restaurant found matching "${query}".`);
    return;
  }

  for (const r of restaurants) {
    const [total, active] = await Promise.all([
      prisma.menuItem.count({ where: { restaurantId: r.id } }),
      prisma.menuItem.count({ where: { restaurantId: r.id, isActive: true } }),
    ]);

    console.log(`Restaurant: ${r.name} (slug=${r.slug})`);
    console.log(`  Menu items total: ${total}`);
    console.log(`  Menu items active: ${active}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

