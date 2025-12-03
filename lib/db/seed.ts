import { config } from 'dotenv';

// Load environment variables BEFORE importing db
config({ path: '.env.local' });

async function seed() {
  // Dynamic import to ensure env is loaded first
  const { db } = await import('./index');
  const { documentCategories, documentTemplates, employees } = await import('./schema');
  console.log('🌱 Seeding database...');

  // Seed categories
  const categories = await db.insert(documentCategories).values([
    {
      name: '온보딩/교육',
      slug: 'onboarding',
      icon: 'GraduationCap',
      path: 'onboarding',
      namespaceType: 'company',
      minClearanceLevel: 'basic',
      sortOrder: 1,
    },
    {
      name: '정책/규정',
      slug: 'policy',
      icon: 'Scroll',
      path: 'policy',
      namespaceType: 'company',
      minClearanceLevel: 'basic',
      sortOrder: 2,
    },
    {
      name: '상품 정보',
      slug: 'product',
      icon: 'Package',
      path: 'product',
      namespaceType: 'company',
      minClearanceLevel: 'standard',
      sortOrder: 3,
    },
    {
      name: '개인 보상',
      slug: 'personal-compensation',
      icon: 'Wallet',
      path: 'personal-compensation',
      namespaceType: 'employee',
      minClearanceLevel: 'basic',
      sortOrder: 4,
    },
  ]).returning();

  console.log(`✓ Seeded ${categories.length} categories`);

  // Build category lookup map
  const categoryMap = Object.fromEntries(
    categories.map(c => [c.slug, c.id])
  );

  // Seed default templates
  const templates = await db.insert(documentTemplates).values([
    {
      name: 'MDRT 분기별 실적',
      slug: 'mdrt-quarterly',
      description: 'MDRT 커미션/총수입 산출 Excel 파일. Gemini AI로 컬럼 자동 감지.',
      categoryId: categoryMap['personal-compensation'],
      fileType: 'excel',
      processingMode: 'employee_split',
      chunkingStrategy: 'row_per_chunk',
      isRecurring: true,
      recurringPeriod: 'quarterly',
    },
    {
      name: '급여/수수료 명세',
      slug: 'compensation-monthly',
      description: '월별 급여 및 수수료 명세 Excel 파일. 인별명세, 건별수수료 등 시트 처리.',
      categoryId: categoryMap['personal-compensation'],
      fileType: 'excel',
      processingMode: 'employee_split',
      chunkingStrategy: 'row_per_chunk',
      isRecurring: true,
      recurringPeriod: 'monthly',
    },
    {
      name: '정책 문서',
      slug: 'policy-document',
      description: '회사 정책 및 규정 PDF 문서.',
      categoryId: categoryMap['policy'],
      fileType: 'pdf',
      processingMode: 'company',
      chunkingStrategy: 'semantic',
      isRecurring: false,
    },
    {
      name: '온보딩/교육 자료',
      slug: 'onboarding-guide',
      description: '신입 교육 및 온보딩 가이드 문서.',
      categoryId: categoryMap['onboarding'],
      fileType: 'pdf',
      processingMode: 'company',
      chunkingStrategy: 'semantic',
      isRecurring: false,
    },
    {
      name: '상품 정보',
      slug: 'product-info',
      description: '보험 상품 정보 문서.',
      categoryId: categoryMap['product'],
      fileType: 'pdf',
      processingMode: 'company',
      chunkingStrategy: 'semantic',
      isRecurring: false,
    },
  ]).returning();

  console.log(`✓ Seeded ${templates.length} templates`);

  // Seed admin employee
  const [admin] = await db.insert(employees).values({
    employeeId: 'ADMIN001',
    name: '관리자',
    email: 'admin@contractorhub.com',
    clearanceLevel: 'advanced',
  }).returning();

  console.log(`✓ Seeded admin: ${admin.employeeId}`);

  console.log('\n✅ Seeding complete!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
