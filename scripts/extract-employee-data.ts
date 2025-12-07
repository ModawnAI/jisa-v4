/**
 * Extract actual data for employee J00307 정다운 from source Excel files
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');

function analyzeAllSheets() {
  // Analyze compensation file
  const compFilePath = path.join(DATA_DIR, '★202509마감_HO&F 건별 및 명세_20251023_배포용_수도권, AL (1).xlsx');
  const compWorkbook = XLSX.readFile(compFilePath);

  console.log('\n' + '='.repeat(80));
  console.log('DETAILED SHEET ANALYSIS - COMPENSATION FILE');
  console.log('='.repeat(80));

  for (const sheetName of compWorkbook.SheetNames) {
    const sheet = compWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    console.log('\nSheet: "' + sheetName + '" - ' + data.length + ' rows');
    if (data.length > 0) {
      const cols = Object.keys(data[0] as object);
      console.log('  Columns:', cols.join(', '));

      // Check for employee ID column
      const idCol = cols.find(c => c.includes('사원') || c.includes('사번') || c.includes('코드'));
      if (idCol) {
        const hasJ00307 = data.some((r: any) => String(r[idCol]).includes('J00307'));
        console.log('  ID column: ' + idCol + ', Has J00307: ' + hasJ00307);
        if (hasJ00307) {
          const matches = data.filter((r: any) => String(r[idCol]).includes('J00307'));
          console.log('  Matching records: ' + matches.length);
        }
      }
    }
  }

  // Analyze MDRT file
  const mdrtFilePath = path.join(DATA_DIR, '전달용▶HO&F_MDRT_커미션,총수입 산출금액_2025년_4분기_251114_공유용 (1).xlsx');
  const mdrtWorkbook = XLSX.readFile(mdrtFilePath);

  console.log('\n' + '='.repeat(80));
  console.log('DETAILED SHEET ANALYSIS - MDRT FILE');
  console.log('='.repeat(80));

  for (const sheetName of mdrtWorkbook.SheetNames) {
    const sheet = mdrtWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    console.log('\nSheet: "' + sheetName + '" - ' + data.length + ' rows');
    if (data.length > 0) {
      const cols = Object.keys(data[0] as object);
      console.log('  Columns:', cols.join(', '));

      // Check for employee ID or name column
      const idCol = cols.find(c => c.includes('사원') || c.includes('사번') || c.includes('코드'));
      const nameCol = cols.find(c => c.includes('이름') || c.includes('성명'));

      if (idCol || nameCol) {
        const matches = data.filter((r: any) => {
          if (idCol && String(r[idCol]).includes('J00307')) return true;
          if (nameCol && String(r[nameCol]).includes('정다운')) return true;
          return false;
        });
        console.log('  ID column: ' + (idCol || 'N/A') + ', Name column: ' + (nameCol || 'N/A'));
        console.log('  Matching records: ' + matches.length);

        if (matches.length > 0) {
          console.log('  First match:', JSON.stringify(matches[0], null, 2).substring(0, 1000));
        }
      }
    }
  }
}

function extractEmployeeData(employeeId: string, employeeName: string) {
  console.log('\n' + '='.repeat(80));
  console.log('EXTRACTING ALL DATA FOR: ' + employeeId + ' ' + employeeName);
  console.log('='.repeat(80));

  // Extract from compensation file
  const compFilePath = path.join(DATA_DIR, '★202509마감_HO&F 건별 및 명세_20251023_배포용_수도권, AL (1).xlsx');
  const compWorkbook = XLSX.readFile(compFilePath);

  const allCompRecords: any[] = [];

  for (const sheetName of compWorkbook.SheetNames) {
    const sheet = compWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const matches = data.filter((r: any) => {
      const vals = Object.values(r).map(v => String(v));
      return vals.some(v => v.includes(employeeId) || v.includes(employeeName));
    });

    if (matches.length > 0) {
      console.log('\nCompensation Sheet "' + sheetName + '": ' + matches.length + ' records');
      allCompRecords.push(...(matches as Record<string, unknown>[]).map(m => ({ ...m, _sheet: sheetName })));
    }
  }

  // Extract from MDRT file
  const mdrtFilePath = path.join(DATA_DIR, '전달용▶HO&F_MDRT_커미션,총수입 산출금액_2025년_4분기_251114_공유용 (1).xlsx');
  const mdrtWorkbook = XLSX.readFile(mdrtFilePath);

  const allMdrtRecords: any[] = [];

  for (const sheetName of mdrtWorkbook.SheetNames) {
    const sheet = mdrtWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const matches = data.filter((r: any) => {
      const vals = Object.values(r).map(v => String(v));
      return vals.some(v => v.includes(employeeId) || v.includes(employeeName));
    });

    if (matches.length > 0) {
      console.log('\nMDRT Sheet "' + sheetName + '": ' + matches.length + ' records');
      allMdrtRecords.push(...(matches as Record<string, unknown>[]).map(m => ({ ...m, _sheet: sheetName })));
    }
  }

  return { compensation: allCompRecords, mdrt: allMdrtRecords };
}

function calculateSummary(records: any[]) {
  let totalCommission = 0;
  let totalRefund = 0;
  let totalFinalPay = 0;
  let contractCount = 0;

  for (const r of records) {
    // Look for commission-related columns
    for (const [key, val] of Object.entries(r)) {
      const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
      if (isNaN(numVal)) continue;

      if (key.includes('수수료') && !key.includes('환수') && !key.includes('최종')) {
        totalCommission += numVal;
      }
      if (key.includes('환수')) {
        totalRefund += numVal;
      }
      if (key.includes('최종') || key.includes('지급')) {
        totalFinalPay += numVal;
      }
    }
    contractCount++;
  }

  return {
    totalCommission,
    totalRefund,
    totalFinalPay,
    contractCount,
  };
}

// Main execution
console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║     EMPLOYEE DATA EXTRACTION: J00307 정다운                                   ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

// First, analyze all sheets to understand structure
analyzeAllSheets();

// Extract specific employee data
const { compensation, mdrt } = extractEmployeeData('J00307', '정다운');

console.log('\n' + '='.repeat(80));
console.log('FULL DATA DUMP');
console.log('='.repeat(80));

if (compensation.length > 0) {
  console.log('\n--- COMPENSATION RECORDS (' + compensation.length + ' total) ---');
  compensation.forEach((r, i) => {
    console.log('\nRecord ' + (i + 1) + ':');
    console.log(JSON.stringify(r, null, 2));
  });

  const summary = calculateSummary(compensation);
  console.log('\n--- COMPENSATION SUMMARY ---');
  console.log('Contract count:', summary.contractCount);
  console.log('Total commission:', summary.totalCommission.toLocaleString());
  console.log('Total refund:', summary.totalRefund.toLocaleString());
  console.log('Total final pay:', summary.totalFinalPay.toLocaleString());
}

if (mdrt.length > 0) {
  console.log('\n--- MDRT RECORDS (' + mdrt.length + ' total) ---');
  mdrt.forEach((r, i) => {
    console.log('\nRecord ' + (i + 1) + ':');
    console.log(JSON.stringify(r, null, 2));
  });
}

console.log('\n✅ Data extraction complete!');
