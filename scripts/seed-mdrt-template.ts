/**
 * MDRT Comprehensive Template Seed Script
 *
 * Creates the MDRT comprehensive template with column mappings
 * for processing MDRT performance tracking Excel files.
 *
 * Run with: npx tsx scripts/seed-mdrt-template.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '../lib/db';
import { documentCategories, documentTypes } from '../lib/db/schema/categories';
import { documentTemplates, templateColumnMappings } from '../lib/db/schema/templates';
import { eq } from 'drizzle-orm';

async function seedMdrtTemplate() {
  console.log('Starting MDRT template seed...');

  // Find or create the "업적" (Performance) category
  let categoryId: string;
  const existingCategory = await db
    .select()
    .from(documentCategories)
    .where(eq(documentCategories.slug, 'performance'))
    .limit(1);

  if (existingCategory.length > 0) {
    categoryId = existingCategory[0].id;
    console.log('Using existing performance category:', categoryId);
  } else {
    // Create the performance category
    const [newCategory] = await db
      .insert(documentCategories)
      .values({
        name: '업적',
        slug: 'performance',
        path: '/performance',
        description: 'MDRT 및 업적 관련 문서',
        minClearanceLevel: 'advanced',
        isActive: true,
      })
      .returning();
    categoryId = newCategory.id;
    console.log('Created performance category:', categoryId);
  }

  // Find or create the "MDRT" document type
  let documentTypeId: string | null = null;
  const existingType = await db
    .select()
    .from(documentTypes)
    .where(eq(documentTypes.slug, 'mdrt-performance'))
    .limit(1);

  if (existingType.length > 0) {
    documentTypeId = existingType[0].id;
    console.log('Using existing MDRT document type:', documentTypeId);
  } else {
    // Create the document type
    const [newType] = await db
      .insert(documentTypes)
      .values({
        categoryId,
        name: 'MDRT 실적표',
        slug: 'mdrt-performance',
        description: 'MDRT 커미션 및 총수입 산출금액 보고서',
        isActive: true,
      })
      .returning();
    documentTypeId = newType.id;
    console.log('Created MDRT document type:', documentTypeId);
  }

  // Check if template already exists
  const existingTemplate = await db
    .select()
    .from(documentTemplates)
    .where(eq(documentTemplates.slug, 'mdrt-comprehensive'))
    .limit(1);

  if (existingTemplate.length > 0) {
    console.log('Template already exists, skipping creation.');
    return;
  }

  // Create the MDRT comprehensive template
  const [template] = await db
    .insert(documentTemplates)
    .values({
      name: 'MDRT 커미션,총수입 산출금액',
      slug: 'mdrt-comprehensive',
      description: `MDRT (Million Dollar Round Table) 성과 추적 템플릿.
FYC (A.커미션) 및 AGI (B.총수입) 기반 자격 판정 지원.
12개월 월별 데이터, 자기계약 조정, 지사/지점별 순위 계산 포함.`,
      categoryId,
      documentTypeId,
      fileType: 'excel',
      processingMode: 'employee_split',
      chunkingStrategy: 'auto',
      isRecurring: true,
      recurringPeriod: 'quarterly',
      retentionDays: 365 * 3, // 3 years
      isActive: true,
    })
    .returning();

  console.log('Created template:', template.id);

  // Create column mappings
  const columnMappings = [
    // Base employee identification columns
    { sourceColumn: 'B', sourceColumnIndex: 1, targetField: 'no', targetFieldType: 'number', fieldRole: 'metadata', sortOrder: 0 },
    { sourceColumn: 'C', sourceColumnIndex: 2, targetField: 'branch', targetFieldType: 'string', fieldRole: 'metadata', sortOrder: 1 },
    { sourceColumn: 'D', sourceColumnIndex: 3, targetField: 'team', targetFieldType: 'string', fieldRole: 'metadata', sortOrder: 2 },
    { sourceColumn: 'E', sourceColumnIndex: 4, targetField: 'employeeId', targetFieldType: 'string', fieldRole: 'employee_identifier', isRequired: true, sortOrder: 3 },
    { sourceColumn: 'F', sourceColumnIndex: 5, targetField: 'employeeName', targetFieldType: 'string', fieldRole: 'metadata', sortOrder: 4 },
    { sourceColumn: 'G', sourceColumnIndex: 6, targetField: 'jobType', targetFieldType: 'string', fieldRole: 'metadata', sortOrder: 5 },

    // Annual totals - Commission (FYC)
    { sourceColumn: 'H', sourceColumnIndex: 7, targetField: 'totalCommission', targetFieldType: 'currency', fieldRole: 'content', sortOrder: 6 },
    { sourceColumn: 'I', sourceColumnIndex: 8, targetField: 'commissionProtection', targetFieldType: 'currency', fieldRole: 'content', sortOrder: 7 },

    // Annual totals - Income (AGI)
    { sourceColumn: 'J', sourceColumnIndex: 9, targetField: 'totalIncome', targetFieldType: 'currency', fieldRole: 'content', sortOrder: 8 },
    { sourceColumn: 'K', sourceColumnIndex: 10, targetField: 'newContractIncome', targetFieldType: 'currency', fieldRole: 'content', sortOrder: 9 },
    { sourceColumn: 'L', sourceColumnIndex: 11, targetField: 'incomeProtection', targetFieldType: 'currency', fieldRole: 'content', sortOrder: 10 },

    // Monthly data block start (columns M onwards)
    { sourceColumn: 'M', sourceColumnIndex: 12, targetField: 'monthlyDataStart', targetFieldType: 'number', fieldRole: 'metadata', sortOrder: 11 },

    // Self-contract columns
    { sourceColumn: 'BU', sourceColumnIndex: 72, targetField: 'selfContractCommissionTotal', targetFieldType: 'currency', fieldRole: 'content', sortOrder: 12 },
    { sourceColumn: 'BV', sourceColumnIndex: 73, targetField: 'selfContractCommissionIncluded', targetFieldType: 'currency', fieldRole: 'content', sortOrder: 13 },
    { sourceColumn: 'BW', sourceColumnIndex: 74, targetField: 'selfContractIncomeTotal', targetFieldType: 'currency', fieldRole: 'content', sortOrder: 14 },
    { sourceColumn: 'BX', sourceColumnIndex: 75, targetField: 'selfContractIncomeIncluded', targetFieldType: 'currency', fieldRole: 'content', sortOrder: 15 },
  ];

  for (const mapping of columnMappings) {
    await db.insert(templateColumnMappings).values({
      templateId: template.id,
      sourceColumn: mapping.sourceColumn,
      sourceColumnIndex: mapping.sourceColumnIndex,
      targetField: mapping.targetField,
      targetFieldType: mapping.targetFieldType,
      fieldRole: mapping.fieldRole,
      isRequired: mapping.isRequired || false,
      sortOrder: mapping.sortOrder,
    });
  }

  console.log(`Created ${columnMappings.length} column mappings`);
  console.log('MDRT template seed complete!');
}

seedMdrtTemplate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
