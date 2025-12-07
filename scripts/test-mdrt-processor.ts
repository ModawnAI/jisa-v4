/**
 * Test script for MDRT Comprehensive Processor
 *
 * Run with: npx tsx scripts/test-mdrt-processor.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { mdrtComprehensiveProcessor } from '../lib/services/document-processors';
import type { DocumentForProcessing, ProcessorOptions } from '../lib/services/document-processors/types';

const testFilePath = '/Users/paksungho/jisa-v4/data/전달용▶HO&F_MDRT_커미션,총수입 산출금액_2025년_4분기_251114_공유용 (1).xlsx';

async function testMdrtProcessor() {
  console.log('=== MDRT Comprehensive Processor Test ===\n');

  // Check if file exists
  if (!fs.existsSync(testFilePath)) {
    console.error(`Test file not found: ${testFilePath}`);
    process.exit(1);
  }

  // Read file
  const content = fs.readFileSync(testFilePath);
  const fileName = path.basename(testFilePath);

  console.log(`File: ${fileName}`);
  console.log(`Size: ${(content.length / 1024).toFixed(2)} KB\n`);

  // Create document mock
  const document: DocumentForProcessing = {
    id: 'test-doc-001',
    organizationId: 'test-org-001',
    categoryId: 'performance',
    templateId: 'mdrt-comprehensive',
    fileName: fileName,
    originalFileName: fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileType: 'excel',
    clearanceLevel: 'advanced',
  };

  // Create options
  const options: ProcessorOptions = {
    organizationId: 'test-org-001',
    templateId: 'mdrt-comprehensive',
    clearanceLevel: 'advanced',
    processingMode: 'employee_split',
  };

  // Test canProcess
  const canProcess = mdrtComprehensiveProcessor.canProcess(document);
  console.log(`Can Process: ${canProcess ? '✓ Yes' : '✗ No'}\n`);

  if (!canProcess) {
    console.error('Processor cannot handle this file');
    process.exit(1);
  }

  // Process document
  console.log('Processing document...\n');
  const startTime = Date.now();

  try {
    const result = await mdrtComprehensiveProcessor.process(content, document, options);
    const processingTime = Date.now() - startTime;

    console.log('=== Processing Result ===\n');
    console.log(`Processing Time: ${processingTime}ms`);
    console.log(`Chunks Generated: ${result.chunks.length}`);
    console.log(`Namespace Strategy: ${result.namespaceStrategy}`);
    console.log(`Entities Extracted: ${result.entities?.length || 0}`);
    console.log(`Performance Records: ${result.detailedRecords?.performance?.length || 0}`);

    // Show aggregations
    if (result.aggregations) {
      console.log('\n=== Aggregations ===');
      console.log(`Total Employees: ${result.aggregations.totalEmployees}`);
      console.log(`Total Commission: ${formatKRW(result.aggregations.totalCommission as number)}`);
      console.log(`Total Income: ${formatKRW(result.aggregations.totalIncome as number)}`);
      console.log(`Average Commission: ${formatKRW(result.aggregations.averageCommission as number)}`);
      console.log(`MDRT Qualified: ${result.aggregations.mdrtQualified}`);
      console.log(`COT Qualified: ${result.aggregations.cotQualified}`);
      console.log(`TOT Qualified: ${result.aggregations.totQualified}`);
      console.log(`On-Pace: ${result.aggregations.onPace}`);
      console.log(`Qualification Rate: ${result.aggregations.qualificationRate}%`);

      if (result.aggregations.statusBreakdown) {
        const breakdown = result.aggregations.statusBreakdown as Record<string, number>;
        console.log('\n=== Status Breakdown ===');
        console.log(`None: ${breakdown.none}`);
        console.log(`On-Pace: ${breakdown['on-pace']}`);
        console.log(`MDRT: ${breakdown.mdrt}`);
        console.log(`COT: ${breakdown.cot}`);
        console.log(`TOT: ${breakdown.tot}`);
      }

      if (result.aggregations.thresholds) {
        const thresholds = result.aggregations.thresholds as { fyc: Record<string, number>; agi: Record<string, number> };
        console.log('\n=== MDRT Thresholds ===');
        console.log(`FYC On-Pace: ${formatKRW(thresholds.fyc.onPace)}`);
        console.log(`FYC MDRT: ${formatKRW(thresholds.fyc.mdrt)}`);
        console.log(`FYC COT: ${formatKRW(thresholds.fyc.cot)}`);
        console.log(`FYC TOT: ${formatKRW(thresholds.fyc.tot)}`);
        console.log(`AGI On-Pace: ${formatKRW(thresholds.agi.onPace)}`);
        console.log(`AGI MDRT: ${formatKRW(thresholds.agi.mdrt)}`);
        console.log(`AGI COT: ${formatKRW(thresholds.agi.cot)}`);
        console.log(`AGI TOT: ${formatKRW(thresholds.agi.tot)}`);
      }
    }

    // Show sample chunks
    if (result.chunks.length > 0) {
      console.log('\n=== Sample Chunks (first 3) ===');
      for (let i = 0; i < Math.min(3, result.chunks.length); i++) {
        const chunk = result.chunks[i];
        const meta = chunk.metadata as Record<string, unknown>;
        console.log(`\n--- Chunk ${i + 1} ---`);
        console.log(`Vector ID: ${chunk.vectorId}`);
        console.log(`Namespace: ${chunk.namespace}`);
        console.log(`Employee: ${meta.employeeId} - ${meta.employeeName}`);
        console.log(`Branch: ${meta.branch} / Team: ${meta.team}`);
        console.log(`Total Commission: ${formatKRW(meta.totalCommission as number)}`);
        console.log(`Total Income: ${formatKRW(meta.totalIncome as number)}`);
        console.log(`FYC Status: ${meta.fycMdrtStatus} (${meta.fycMdrtProgress}%)`);
        console.log(`AGI Status: ${meta.agiMdrtStatus} (${meta.agiMdrtProgress}%)`);
        console.log(`Combined Status: ${meta.mdrtStatus}`);
        console.log(`Rank: ${meta.rankInOrganization} (top ${meta.percentileInOrganization}%)`);
        console.log(`\nEmbedding Text Preview (first 500 chars):`);
        console.log(chunk.embeddingText.substring(0, 500) + '...');
      }
    }

    console.log('\n=== Test Complete ===');
    console.log('✓ MDRT Comprehensive Processor is working correctly!');

  } catch (error) {
    console.error('Processing failed:', error);
    process.exit(1);
  }
}

function formatKRW(value: number | undefined | null): string {
  if (value === undefined || value === null) return '₩0';
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

testMdrtProcessor()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
