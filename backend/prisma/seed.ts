import { PrismaClient, ProductType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // Создаем категории если их нет (с типами)
  const categories = [
    // PRODUCT categories
    { name: 'Напитки', type: ProductType.PRODUCT },
    { name: 'Снеки', type: ProductType.PRODUCT },
    { name: 'Алкоголь', type: ProductType.PRODUCT },
    // SPORT_PIT categories
    { name: 'Протеин', type: ProductType.SPORT_PIT },
    { name: 'Витамины', type: ProductType.SPORT_PIT },
    { name: 'Гейнеры', type: ProductType.SPORT_PIT },
    // FOOD categories
    { name: 'Завтраки', type: ProductType.FOOD },
    { name: 'Обеды', type: ProductType.FOOD },
    { name: 'Десерты', type: ProductType.FOOD },
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categories) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name },
    });
    if (existing) {
      // Update type if exists
      await prisma.category.update({
        where: { id: existing.id },
        data: { type: cat.type },
      });
      categoryMap[cat.name] = existing.id;
      console.log(`✓ Category "${cat.name}" updated (type: ${cat.type})`);
    } else {
      const created = await prisma.category.create({
        data: { name: cat.name, type: cat.type },
      });
      categoryMap[cat.name] = created.id;
      console.log(`✓ Created category "${cat.name}" (type: ${cat.type})`);
    }
  }

  // Получаем все активные бары
  const bars = await prisma.bar.findMany({ where: { isActive: true } });
  console.log(`Found ${bars.length} active bars`);

  // Продукты (PRODUCT type)
  const products = [
    { name: 'Coca-Cola 0.5л', barcode: '5449000000439', costPrice: 45, defaultPrice: 80, categoryName: 'Напитки' },
    { name: 'Pepsi 0.5л', barcode: '4600494600012', costPrice: 42, defaultPrice: 75, categoryName: 'Напитки' },
    { name: 'Red Bull 0.25л', barcode: '9002490100070', costPrice: 90, defaultPrice: 150, categoryName: 'Напитки' },
    { name: 'Вода Aqua 0.5л', barcode: '4607034170011', costPrice: 20, defaultPrice: 40, categoryName: 'Напитки' },
    { name: 'Сникерс', barcode: '5000159461122', costPrice: 35, defaultPrice: 60, categoryName: 'Снеки' },
    { name: 'Чипсы Lays 80г', barcode: '5900259099846', costPrice: 55, defaultPrice: 90, categoryName: 'Снеки' },
    { name: 'Пиво Балтика 7', barcode: '4600600000073', costPrice: 60, defaultPrice: 120, categoryName: 'Алкоголь' },
    { name: 'Пиво Heineken', barcode: '8711800500015', costPrice: 85, defaultPrice: 180, categoryName: 'Алкоголь' },
  ];

  // Спортпит (SPORT_PIT type)
  const sportpit = [
    { 
      name: 'Whey Protein Gold Standard', 
      costPrice: 3500, 
      defaultPrice: 4500, 
      categoryName: 'Протеин',
      imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400',
      description: 'Сывороточный протеин высшего качества. 24г белка на порцию.'
    },
    { 
      name: 'Creatine Monohydrate 300g', 
      costPrice: 800, 
      defaultPrice: 1200, 
      categoryName: 'Протеин',
      imageUrl: 'https://images.unsplash.com/photo-1579722820903-dce3c5eb5bfe?w=400',
      description: 'Чистый креатин моногидрат для увеличения силы и выносливости.'
    },
    { 
      name: 'BCAA 2:1:1 400g', 
      costPrice: 1200, 
      defaultPrice: 1800, 
      categoryName: 'Протеин',
      imageUrl: 'https://images.unsplash.com/photo-1517344368193-41552b6ad3f5?w=400',
      description: 'Аминокислоты для восстановления мышц после тренировки.'
    },
    { 
      name: 'Витамин D3 5000 IU', 
      costPrice: 400, 
      defaultPrice: 650, 
      categoryName: 'Витамины',
      imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=400',
      description: '90 капсул. Поддержка иммунитета и здоровья костей.'
    },
    { 
      name: 'Омега-3 Fish Oil', 
      costPrice: 600, 
      defaultPrice: 950, 
      categoryName: 'Витамины',
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
      description: 'Рыбий жир высокой концентрации. 120 капсул.'
    },
    { 
      name: 'Mass Gainer 3kg', 
      costPrice: 2200, 
      defaultPrice: 3200, 
      categoryName: 'Гейнеры',
      imageUrl: 'https://images.unsplash.com/photo-1532384748853-8f54a8f476e2?w=400',
      description: 'Гейнер для набора массы. 50г белка и 250г углеводов на порцию.'
    },
  ];

  // Еда (FOOD type)
  const food = [
    { 
      name: 'Овсянка с ягодами', 
      costPrice: 80, 
      defaultPrice: 180, 
      categoryName: 'Завтраки',
      imageUrl: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400',
      description: 'Овсяная каша на молоке со свежими ягодами и мёдом.'
    },
    { 
      name: 'Яичница с беконом', 
      costPrice: 120, 
      defaultPrice: 250, 
      categoryName: 'Завтраки',
      imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400',
      description: '3 яйца, бекон, тост. Классический завтрак.'
    },
    { 
      name: 'Куриная грудка с рисом', 
      costPrice: 150, 
      defaultPrice: 320, 
      categoryName: 'Обеды',
      imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400',
      description: 'Запечённая куриная грудка с рисом и овощами. 350г.'
    },
    { 
      name: 'Стейк из говядины', 
      costPrice: 350, 
      defaultPrice: 650, 
      categoryName: 'Обеды',
      imageUrl: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400',
      description: 'Стейк medium rare с картофелем фри. 300г.'
    },
    { 
      name: 'Салат Цезарь', 
      costPrice: 100, 
      defaultPrice: 220, 
      categoryName: 'Обеды',
      imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400',
      description: 'Классический Цезарь с курицей и пармезаном.'
    },
    { 
      name: 'Чизкейк Нью-Йорк', 
      costPrice: 90, 
      defaultPrice: 180, 
      categoryName: 'Десерты',
      imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400',
      description: 'Классический чизкейк с ягодным соусом.'
    },
    { 
      name: 'Протеиновый брауни', 
      costPrice: 70, 
      defaultPrice: 150, 
      categoryName: 'Десерты',
      imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400',
      description: 'Шоколадный брауни с 20г протеина.'
    },
  ];

  // Функция для создания продукта
  async function createProduct(
    data: {
      name: string;
      barcode?: string;
      costPrice: number;
      defaultPrice: number;
      categoryName: string;
      imageUrl?: string;
      description?: string;
    },
    type: ProductType
  ) {
    const existing = await prisma.product.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      console.log(`  - "${data.name}" already exists`);
      return existing;
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        barcode: data.barcode,
        type,
        costPrice: data.costPrice,
        defaultPrice: data.defaultPrice,
        categoryId: categoryMap[data.categoryName],
        imageUrl: data.imageUrl,
        description: data.description,
      },
    });

    // Создаем BarProduct для всех баров
    if (bars.length > 0) {
      await prisma.barProduct.createMany({
        data: bars.map((bar) => ({
          barId: bar.id,
          productId: product.id,
          price: data.defaultPrice,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }

    console.log(`  ✓ Created "${data.name}"`);
    return product;
  }

  // Создаем продукты
  console.log('\n📦 Creating PRODUCTS:');
  for (const p of products) {
    await createProduct(p, ProductType.PRODUCT);
  }

  console.log('\n💪 Creating SPORTPIT:');
  for (const p of sportpit) {
    await createProduct(p, ProductType.SPORT_PIT);
  }

  console.log('\n🍽️ Creating FOOD:');
  for (const p of food) {
    await createProduct(p, ProductType.FOOD);
  }

  console.log('\n✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
