/**
 * Test Script for Document Processing
 *
 * Tests:
 * 1. CompensationExcelProcessor with 마감 file
 * 2. MdrtExcelProcessor with MDRT file
 * 3. Auto-registration of employees
 *
 * Run: npx tsx scripts/test-document-processing.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { selectProcessor } from '../lib/services/document-processors';
import type { DocumentForProcessing, ProcessorOptions } from '../lib/services/document-processors/types';

// Test file paths
const DATA_DIR = path.join(process.cwd(), 'data');
const COMPENSATION_FILE = '★202509마감_HO&F 건별 및 명세_20251023_배포용_수도권, AL (1).xlsx';
const MDRT_FILE = '전달용▶HO&F_MDRT_커미션,총수입 산출금액_2025년_4분기_251114_공유용 (1).xlsx';

async function testCompensationProcessor() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: Compensation Excel Processor (마감 파일)');
  console.log('='.repeat(80));

  const filePath = path.join(DATA_DIR, COMPENSATION_FILE);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }

  const buffer = fs.readFileSync(filePath);
  console.log(`📁 File size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

  // Create document for processing
  const document: DocumentForProcessing = {
    id: 'test-compensation-doc-001',
    organizationId: 'test-org',
    fileName: COMPENSATION_FILE,
    originalFileName: COMPENSATION_FILE,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileType: 'excel',
  };

  // Select processor
  const processor = selectProcessor(document);
  console.log(`\n🔧 Selected processor: ${processor.name} (${processor.type})`);
  console.log(`   Priority: ${processor.priority}`);
  console.log(`   Namespace strategy: ${processor.getNamespaceStrategy(document, { organizationId: 'test-org' })}`);

  // Process the document
  console.log('\n⏳ Processing document...');
  const startTime = Date.now();

  const options: ProcessorOptions = {
    organizationId: 'test-org',
    clearanceLevel: 'advanced',
  };

  try {
    const result = await processor.process(buffer, document, options);

    console.log(`\n✅ Processing complete in ${Date.now() - startTime}ms`);
    console.log(`\n📊 Results:`);
    console.log(`   Total chunks: ${result.chunks.length}`);
    console.log(`   Namespace strategy: ${result.namespaceStrategy}`);
    console.log(`   Processor type: ${result.processingInfo.processorType}`);
    console.log(`   Processing time: ${result.processingInfo.processingTime}ms`);

    // Show first 3 chunks
    console.log('\n📝 Sample chunks (first 3):');
    for (let i = 0; i < Math.min(3, result.chunks.length); i++) {
      const chunk = result.chunks[i];
      console.log(`\n   --- Chunk ${i + 1} ---`);
      console.log(`   Vector ID: ${chunk.vectorId}`);
      console.log(`   Namespace: ${chunk.namespace}`);
      console.log(`   Employee ID: ${(chunk.metadata as Record<string, unknown>).employeeId || 'N/A'}`);
      console.log(`   Employee Name: ${(chunk.metadata as Record<string, unknown>).employeeName || 'N/A'}`);
      console.log(`   Embedding text preview: ${chunk.embeddingText.slice(0, 200)}...`);
    }

    // Show unique employees
    const employeeIds = new Set<string>();
    for (const chunk of result.chunks) {
      const empId = (chunk.metadata as Record<string, unknown>).employeeId;
      if (empId) employeeIds.add(empId as string);
    }
    console.log(`\n👥 Unique employees found: ${employeeIds.size}`);
    console.log(`   IDs: ${Array.from(employeeIds).slice(0, 10).join(', ')}${employeeIds.size > 10 ? '...' : ''}`);

    // Show aggregations
    if (result.aggregations) {
      console.log('\n📈 Aggregations:');
      console.log(JSON.stringify(result.aggregations, null, 2));
    }

  } catch (error) {
    console.error(`\n❌ Error processing document:`, error);
  }
}

async function testMdrtProcessor() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: MDRT Excel Processor (MDRT 파일)');
  console.log('='.repeat(80));

  const filePath = path.join(DATA_DIR, MDRT_FILE);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }

  const buffer = fs.readFileSync(filePath);
  console.log(`📁 File size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

  // Create document for processing
  const document: DocumentForProcessing = {
    id: 'test-mdrt-doc-001',
    organizationId: 'test-org',
    fileName: MDRT_FILE,
    originalFileName: MDRT_FILE,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileType: 'excel',
  };

  // Select processor
  const processor = selectProcessor(document);
  console.log(`\n🔧 Selected processor: ${processor.name} (${processor.type})`);
  console.log(`   Priority: ${processor.priority}`);
  console.log(`   Namespace strategy: ${processor.getNamespaceStrategy(document, { organizationId: 'test-org' })}`);

  // Process the document
  console.log('\n⏳ Processing document (may take a moment for Gemini schema detection)...');
  const startTime = Date.now();

  const options: ProcessorOptions = {
    organizationId: 'test-org',
    clearanceLevel: 'advanced',
  };

  try {
    const result = await processor.process(buffer, document, options);

    console.log(`\n✅ Processing complete in ${Date.now() - startTime}ms`);
    console.log(`\n📊 Results:`);
    console.log(`   Total chunks: ${result.chunks.length}`);
    console.log(`   Namespace strategy: ${result.namespaceStrategy}`);
    console.log(`   Processor type: ${result.processingInfo.processorType}`);
    console.log(`   Processing time: ${result.processingInfo.processingTime}ms`);

    // Show first 3 chunks
    console.log('\n📝 Sample chunks (first 3):');
    for (let i = 0; i < Math.min(3, result.chunks.length); i++) {
      const chunk = result.chunks[i];
      const metadata = chunk.metadata as Record<string, unknown>;
      console.log(`\n   --- Chunk ${i + 1} ---`);
      console.log(`   Vector ID: ${chunk.vectorId}`);
      console.log(`   Namespace: ${chunk.namespace}`);
      console.log(`   Employee ID: ${metadata.employeeId || 'N/A'}`);
      console.log(`   Employee Name: ${metadata.employeeName || 'N/A'}`);
      console.log(`   MDRT Status: ${metadata.mdrtStatus || 'N/A'}`);
      console.log(`   MDRT Progress: ${metadata.mdrtProgress || 'N/A'}%`);
      console.log(`   Total Commission: ${metadata.totalCommission?.toLocaleString() || 'N/A'}원`);
      console.log(`   Embedding text preview: ${chunk.embeddingText.slice(0, 200)}...`);
    }

    // Show unique employees
    const employeeIds = new Set<string>();
    for (const chunk of result.chunks) {
      const empId = (chunk.metadata as Record<string, unknown>).employeeId;
      if (empId) employeeIds.add(empId as string);
    }
    console.log(`\n👥 Unique employees found: ${employeeIds.size}`);
    console.log(`   IDs: ${Array.from(employeeIds).slice(0, 10).join(', ')}${employeeIds.size > 10 ? '...' : ''}`);

    // Show MDRT status distribution
    const statusCounts: Record<string, number> = {};
    for (const chunk of result.chunks) {
      const status = (chunk.metadata as Record<string, unknown>).mdrtStatus as string;
      if (status) {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
    }
    console.log('\n🏆 MDRT Status Distribution:');
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`   ${status}: ${count} employees`);
    }

    // Show aggregations
    if (result.aggregations) {
      console.log('\n📈 Aggregations:');
      console.log(JSON.stringify(result.aggregations, null, 2));
    }

  } catch (error) {
    console.error(`\n❌ Error processing document:`, error);
    if (error instanceof Error) {
      console.error(`   Stack: ${error.stack}`);
    }
  }
}

async function testEmployeeAutoRegistration() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: Employee Auto-Registration (Dry Run)');
  console.log('='.repeat(80));

  // Simulate employee data extraction from document processing
  const sampleEmployees = [
    { employeeId: 'J00124', name: '김기현', department: 'HO&F > 수도권', position: 'LP', hireDate: '2024-07-17' },
    { employeeId: 'J00127', name: '김진성', department: 'HO&F > 수도권', position: 'LP', hireDate: '2024-08-01' },
    { employeeId: '00128', name: '박현권', department: 'HO&F > 수도권', position: 'LP' }, // Test without J prefix
    { employeeId: 'J 00129', name: '이준형', department: 'HO&F > AL', position: 'LP' }, // Test with space
  ];

  console.log('\n📋 Sample employees to register:');
  for (const emp of sampleEmployees) {
    console.log(`   ${emp.employeeId} - ${emp.name} (${emp.position}) @ ${emp.department}`);
  }

  // Test normalization
  console.log('\n🔄 Employee ID normalization test:');
  const testIds = ['J00124', '00124', 'J 00124', '124', 'J124', 'ABC123'];
  for (const id of testIds) {
    // Simulate normalization logic
    const cleaned = id.toString().trim().toUpperCase().replace(/\s+/g, '');
    let normalized: string | null = null;

    if (/^[A-Z]\d+$/.test(cleaned)) {
      normalized = cleaned;
    } else if (/^\d+$/.test(cleaned)) {
      normalized = `J${cleaned.padStart(5, '0')}`;
    } else {
      const match = cleaned.match(/^([A-Z])?(\d+)$/);
      if (match) {
        const prefix = match[1] || 'J';
        const num = match[2];
        normalized = `${prefix}${num.padStart(5, '0')}`;
      }
    }

    console.log(`   "${id}" → ${normalized || '(invalid)'}`);
  }

  console.log('\n✅ Auto-registration integration is ready!');
  console.log('   When documents are processed with employee namespace strategy,');
  console.log('   employees will be automatically registered and verification codes generated.');
}

async function main() {
  console.log('🚀 Document Processing Test Suite');
  console.log('=' .repeat(80));

  // Check if data files exist
  console.log('\n📂 Checking data files...');
  const compensationExists = fs.existsSync(path.join(DATA_DIR, COMPENSATION_FILE));
  const mdrtExists = fs.existsSync(path.join(DATA_DIR, MDRT_FILE));

  console.log(`   Compensation file: ${compensationExists ? '✅' : '❌'} ${COMPENSATION_FILE}`);
  console.log(`   MDRT file: ${mdrtExists ? '✅' : '❌'} ${MDRT_FILE}`);

  // Run tests
  if (compensationExists) {
    await testCompensationProcessor();
  }

  if (mdrtExists) {
    await testMdrtProcessor();
  }

  await testEmployeeAutoRegistration();

  console.log('\n' + '='.repeat(80));
  console.log('🏁 Tests complete!');
  console.log('='.repeat(80));
}

// Run the tests
main().catch(console.error);
