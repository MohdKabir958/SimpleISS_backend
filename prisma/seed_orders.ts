import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding mock orders for The Golden Spoon...');
  
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: 'the-golden-spoon' },
    include: { tables: true, menuItems: true }
  });

  if (!restaurant) {
    console.error('Restaurant The Golden Spoon not found!');
    return;
  }

  if (restaurant.tables.length === 0 || restaurant.menuItems.length === 0) {
    console.error('Restaurant needs tables and menu items first!');
    return;
  }

  const table = restaurant.tables[0];
  const items = restaurant.menuItems;

  // Create an active session
  let session = await prisma.tableSession.findFirst({
    where: { tableId: table.id, status: 'ACTIVE' }
  });

  if (!session) {
    session = await prisma.tableSession.create({
      data: {
        id: uuidv4(),
        tableId: table.id,
        restaurantId: restaurant.id,
        status: 'ACTIVE',
        totalAmount: 0,
      }
    });
  }

  // Create 3 orders with different statuses
  const statuses = ['PLACED', 'PREPARING', 'READY'];
  let orderNumberCount = 1000;

  for (const status of statuses) {
    const orderId = uuidv4();
    const item1 = items[Math.floor(Math.random() * items.length)];
    const item2 = items[Math.floor(Math.random() * items.length)];

    const amount = item1.price * 2 + item2.price * 1;

    await prisma.order.create({
      data: {
        id: orderId,
        orderNumber: `${restaurant.orderPrefix}-${orderNumberCount++}`,
        sessionId: session.id,
        restaurantId: restaurant.id,
        tableId: table.id,
        status: status,
        totalAmount: amount,
        notes: status === 'PLACED' ? 'Extra spicy please' : null,
        idempotencyKey: uuidv4(),
        items: {
          create: [
            {
              id: uuidv4(),
              menuItemId: item1.id,
              itemName: item1.name,
              itemPrice: item1.price,
              quantity: 2,
            },
            {
              id: uuidv4(),
              menuItemId: item2.id,
              itemName: item2.name,
              itemPrice: item2.price,
              quantity: 1,
            }
          ]
        }
      }
    });
    console.log(`Created order ${status}`);
  }

  console.log('Done!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
