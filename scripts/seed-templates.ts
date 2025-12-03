/**
 * Seed Default Templates
 *
 * Run: npx tsx scripts/seed-templates.ts
 *
 * Seeds the default templates for MDRT, Compensation, and PDF documents.
 * Can be run on an existing database without affecting other data.
 */

import { config } from 'dotenv';

// Load environment variables BEFORE importing db
config({ path: '.env.local' });

const DEFAULT_TEMPLATES = [
  {
    name: 'MDRT 분기별 실적',
    slug: 'mdrt-quarterly',
    description: 'MDRT 커미션/총수입 산출 Excel 파일. Gemini AI로 컬럼 자동 감지.',
    categorySlug: 'personal-compensation',
    fileType: 'excel' as const,
    processingMode: 'employee_split' as const,
    chunkingStrategy: 'row_per_chunk' as const,
    isRecurring: true,
    recurringPeriod: 'quarterly',
  },
  {
    name: '급여/수수료 명세',
    slug: 'compensation-monthly',
    description: '월별 급여 및 수수료 명세 Excel 파일. 인별명세, 건별수수료 등 시트 처리.',
    categorySlug: 'personal-compensation',
    fileType: 'excel' as const,
    processingMode: 'employee_split' as const,
    chunkingStrategy: 'row_per_chunk' as const,
    isRecurring: true,
    recurringPeriod: 'monthly',
  },
  {
    name: '정책 문서',
    slug: 'policy-document',
    description: '회사 정책 및 규정 PDF 문서.',
    categorySlug: 'policy',
    fileType: 'pdf' as const,
    processingMode: 'company' as const,
    chunkingStrategy: 'semantic' as const,
    isRecurring: false,
  },
  {
    name: '온보딩/교육 자료',
    slug: 'onboarding-guide',
    description: '신입 교육 및 온보딩 가이드 문서.',
    categorySlug: 'onboarding',
    fileType: 'pdf' as const,
    processingMode: 'company' as const,
    chunkingStrategy: 'semantic' as const,
    isRecurring: false,
  },
  {
    name: '상품 정보',
    slug: 'product-info',
    description: '보험 상품 정보 문서.',
    categorySlug: 'product',
    fileType: 'pdf' as const,
    processingMode: 'company' as const,
    chunkingStrategy: 'semantic' as const,
    isRecurring: false,
  },
];

async function seedTemplates() {
  // Dynamic imports to ensure env is loaded first
  const { db } = await import('../lib/db');
  const { documentCategories, documentTemplates } = await import('../lib/db/schema');
  const { eq } = await import('drizzle-orm');

  console.log('🌱 Seeding default templates...\n');

  // Fetch categories
  const categories = await db.select().from(documentCategories);
  const categoryMap = Object.fromEntries(
    categories.map(c => [c.slug, c.id])
  );

  if (categories.length === 0) {
    console.error('❌ No categories found. Run npm run db:seed first.');
    process.exit(1);
  }

  let seededCount = 0;
  let skippedCount = 0;

  for (const template of DEFAULT_TEMPLATES) {
    // Check if template already exists
    const existing = await db
      .select()
      .from(documentTemplates)
      .where(eq(documentTemplates.slug, template.slug))
      .limit(1);

    if (existing.length > 0) {
      console.log(`⏭️  Skipped: ${template.name} (already exists)`);
      skippedCount++;
      continue;
    }

    // Get category ID
    const categoryId = categoryMap[template.categorySlug];
    if (!categoryId) {
      console.log(`⚠️  Skipped: ${template.name} (category '${template.categorySlug}' not found)`);
      skippedCount++;
      continue;
    }

    // Insert template
    const { categorySlug: _categorySlug, ...templateData } = template;
    await db.insert(documentTemplates).values({
      ...templateData,
      categoryId,
    });

    console.log(`✓ Seeded: ${template.name}`);
    seededCount++;
  }

  console.log(`\n✅ Done! Seeded: ${seededCount}, Skipped: ${skippedCount}`);
  process.exit(0);
}

seedTemplates().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
