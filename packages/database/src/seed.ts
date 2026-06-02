import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#ef4444' },
  { name: 'Groceries', icon: '🛒', color: '#f97316' },
  { name: 'Travel', icon: '✈️', color: '#eab308' },
  { name: 'Transportation', icon: '🚗', color: '#84cc16' },
  { name: 'Entertainment', icon: '🎬', color: '#22c55e' },
  { name: 'Utilities', icon: '💡', color: '#06b6d4' },
  { name: 'Shopping', icon: '🛍️', color: '#3b82f6' },
  { name: 'Rent', icon: '🏠', color: '#8b5cf6' },
  { name: 'Bills', icon: '📄', color: '#ec4899' },
  { name: 'Healthcare', icon: '🏥', color: '#f43f5e' },
  { name: 'Education', icon: '📚', color: '#0ea5e9' },
  { name: 'Sports & Fitness', icon: '💪', color: '#10b981' },
  { name: 'Other', icon: '📦', color: '#6b7280' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Create default categories
  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: `default-${category.name.toLowerCase().replace(/[^a-z]/g, '-')}` },
      update: {},
      create: {
        id: `default-${category.name.toLowerCase().replace(/[^a-z]/g, '-')}`,
        ...category,
        isDefault: true,
      },
    });
  }

  // Create admin user
  const adminPassword = await hash(process.env.ADMIN_PASSWORD || 'Admin@12345', 12);
  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@expenseflow.app' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@expenseflow.app',
      username: 'admin',
      displayName: 'Admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
