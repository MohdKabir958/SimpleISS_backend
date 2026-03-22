import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Starting seed...');

  // 1. Super Admin
  const superAdminPassword = await bcrypt.hash('Admin@123456', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@system.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'admin@system.com',
      password: superAdminPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Super Admin: ${superAdmin.email}`);

  // 2. Demo Restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'the-golden-spoon' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'The Golden Spoon',
      slug: 'the-golden-spoon',
      address: '123 MG Road, Bangalore',
      phone: '+91 98765 43210',
      email: 'info@goldenspoon.com',
      openingTime: '09:00',
      closingTime: '23:00',
      orderPrefix: 'GS',
      isActive: true,
    },
  });
  console.log(`✅ Restaurant: ${restaurant.name}`);

  // 2b. Demo restaurant (slug: demo) for customer "Have a link?" testing
  const DEMO_TABLE_ID = '11111111-1111-1111-1111-111111111111';
  const demoRestaurant = await prisma.restaurant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Demo Restaurant',
      slug: 'demo',
      address: '456 Demo Street',
      phone: '+91 00000 00000',
      email: 'demo@simpliss.com',
      openingTime: '09:00',
      closingTime: '23:00',
      orderPrefix: 'DEMO',
      isActive: true,
    },
  });
  await prisma.table.upsert({
    where: { id: DEMO_TABLE_ID },
    update: {},
    create: {
      id: DEMO_TABLE_ID,
      restaurantId: demoRestaurant.id,
      tableNumber: 1,
      capacity: 4,
      isActive: true,
    },
  });
  const demoCategory = await prisma.menuCategory.upsert({
    where: {
      restaurantId_name: { restaurantId: demoRestaurant.id, name: 'Demo Items' },
    },
    update: {},
    create: {
      id: uuidv4(),
      restaurantId: demoRestaurant.id,
      name: 'Demo Items',
      description: 'Sample items for testing',
      sortOrder: 0,
      isActive: true,
    },
  });
  const demoItem1Id = '22222222-2222-2222-2222-222222222221';
  const demoItem2Id = '22222222-2222-2222-2222-222222222222';
  await prisma.menuItem.upsert({
    where: { id: demoItem1Id },
    update: {},
    create: { id: demoItem1Id, restaurantId: demoRestaurant.id, categoryId: demoCategory.id, name: 'Demo Burger', description: 'Tasty demo burger', price: 9.99, isVeg: false, isAvailable: true, sortOrder: 1 },
  });
  await prisma.menuItem.upsert({
    where: { id: demoItem2Id },
    update: {},
    create: { id: demoItem2Id, restaurantId: demoRestaurant.id, categoryId: demoCategory.id, name: 'Demo Salad', description: 'Fresh demo salad', price: 5.99, isVeg: true, isAvailable: true, sortOrder: 2 },
  });
  console.log(`✅ Demo Restaurant: slug=demo, tableId=${DEMO_TABLE_ID}`);

  // 3. Restaurant Admin
  const restaurantAdminPassword = await bcrypt.hash('Restaurant@123', 12);
  const restaurantAdmin = await prisma.user.upsert({
    where: { email: 'restaurant@demo.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'restaurant@demo.com',
      password: restaurantAdminPassword,
      name: 'Restaurant Manager',
      role: 'RESTAURANT_ADMIN',
      restaurantId: restaurant.id,
      isActive: true,
    },
  });
  console.log(`✅ Restaurant Admin: ${restaurantAdmin.email}`);

  // 4. Kitchen Staff
  const kitchenPassword = await bcrypt.hash('Kitchen@123', 12);
  const kitchenStaff = await prisma.user.upsert({
    where: { email: 'kitchen@demo.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'kitchen@demo.com',
      password: kitchenPassword,
      name: 'Kitchen Staff',
      role: 'KITCHEN_STAFF',
      restaurantId: restaurant.id,
      isActive: true,
    },
  });
  console.log(`✅ Kitchen Staff: ${kitchenStaff.email}`);

  // 5. Menu Categories
  const categories = [
    { name: 'Starters', description: 'Begin your meal with our delicious starters', sortOrder: 1 },
    { name: 'Main Course', description: 'Hearty main course dishes', sortOrder: 2 },
    { name: 'Breads', description: 'Freshly baked breads from our tandoor', sortOrder: 3 },
    { name: 'Beverages', description: 'Refreshing drinks and beverages', sortOrder: 4 },
    { name: 'Desserts', description: 'Sweet treats to end your meal', sortOrder: 5 },
  ];

  const createdCategories: Record<string, string> = {};

  for (const cat of categories) {
    const category = await prisma.menuCategory.upsert({
      where: {
        restaurantId_name: {
          restaurantId: restaurant.id,
          name: cat.name,
        },
      },
      update: {},
      create: {
        id: uuidv4(),
        restaurantId: restaurant.id,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
    createdCategories[cat.name] = category.id;
  }
  console.log(`✅ Menu Categories: ${Object.keys(createdCategories).length} created`);

  // 6. Menu Items
  const menuItems = [
    // Starters
    { category: 'Starters', name: 'Chicken Tikka', description: 'Tender chicken marinated in aromatic spices, grilled to perfection', price: 10.99, isVeg: false },
    { category: 'Starters', name: 'Caesar Salad', description: 'Crisp romaine, parmesan, croutons with classic dressing', price: 8.99, isVeg: true },
    { category: 'Starters', name: 'Paneer Tikka', description: 'Cottage cheese cubes marinated in spiced yogurt, grilled', price: 9.99, isVeg: true },
    { category: 'Starters', name: 'Fish Amritsari', description: 'Crispy battered fish fillets with mint chutney', price: 12.99, isVeg: false },

    // Main Course
    { category: 'Main Course', name: 'Butter Chicken', description: 'Creamy tomato-based curry with tender chicken pieces', price: 14.99, isVeg: false },
    { category: 'Main Course', name: 'Margherita Pizza', description: 'Classic pizza with fresh mozzarella, tomatoes, and basil', price: 12.99, isVeg: true },
    { category: 'Main Course', name: 'Biryani', description: 'Fragrant basmati rice layered with spiced chicken and saffron', price: 15.99, isVeg: false },
    { category: 'Main Course', name: 'Masala Dosa', description: 'Crispy crepe filled with spiced potato filling', price: 8.99, isVeg: true },

    // Breads
    { category: 'Breads', name: 'Garlic Naan', description: 'Freshly baked flatbread with garlic butter', price: 3.99, isVeg: true },
    { category: 'Breads', name: 'Butter Roti', description: 'Whole wheat flatbread brushed with butter', price: 2.99, isVeg: true },
    { category: 'Breads', name: 'Cheese Naan', description: 'Naan stuffed with melted cheese', price: 4.99, isVeg: true },

    // Beverages
    { category: 'Beverages', name: 'Mango Lassi', description: 'Chilled yogurt-based mango smoothie', price: 4.99, isVeg: true },
    { category: 'Beverages', name: 'Masala Chai', description: 'Traditional Indian spiced tea', price: 2.99, isVeg: true },
    { category: 'Beverages', name: 'Fresh Lime Soda', description: 'Refreshing lime soda with mint', price: 3.49, isVeg: true },

    // Desserts
    { category: 'Desserts', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center', price: 7.99, isVeg: true },
    { category: 'Desserts', name: 'Gulab Jamun', description: 'Soft milk dumplings soaked in rose-flavored syrup', price: 5.99, isVeg: true },
    { category: 'Desserts', name: 'Rasgulla', description: 'Soft spongy cottage cheese balls in sugar syrup', price: 5.49, isVeg: true },
  ];

  let itemCount = 0;
  for (const item of menuItems) {
    const categoryId = createdCategories[item.category];
    if (!categoryId) continue;

    await prisma.menuItem.create({
      data: {
        id: uuidv4(),
        restaurantId: restaurant.id,
        categoryId,
        name: item.name,
        description: item.description,
        price: item.price,
        isVeg: item.isVeg,
        isAvailable: true,
        sortOrder: itemCount + 1,
      },
    });
    itemCount++;
  }
  console.log(`✅ Menu Items: ${itemCount} created`);

  // 7. Tables (1-10)
  for (let i = 1; i <= 10; i++) {
    await prisma.table.upsert({
      where: {
        restaurantId_tableNumber: {
          restaurantId: restaurant.id,
          tableNumber: i,
        },
      },
      update: {},
      create: {
        id: uuidv4(),
        restaurantId: restaurant.id,
        tableNumber: i,
        capacity: i <= 4 ? 2 : i <= 7 ? 4 : 6,
        isActive: true,
      },
    });
  }
  console.log(`✅ Tables: 10 created`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('  Super Admin:       admin@system.com / Admin@123456');
  console.log('  Restaurant Admin:  restaurant@demo.com / Restaurant@123');
  console.log('  Kitchen Staff:     kitchen@demo.com / Kitchen@123');
  console.log('\n📱 Customer flow (demo restaurant):');
  console.log('  Slug: demo   Table ID: ' + DEMO_TABLE_ID);
  console.log('  Test URL (Flutter web): http://localhost:8080/r/demo/t/' + DEMO_TABLE_ID);
  console.log('  Generate QR PNG: npm run qr:demo (see backend/docs/DATABASE.md)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
