import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = '/Users/paksungho/jisa-v4/data/전달용▶HO&F_MDRT_커미션,총수입 산출금액_2025년_4분기_251114_공유용 (1).xlsx';

const workbook = XLSX.read(fs.readFileSync(filePath));

console.log('=== COMPLETE MDRT EXCEL ANALYSIS ===\n');

// Analyze main data sheet in detail
const mainSheet = workbook.Sheets['HO&F_25.01~'];
const range = XLSX.utils.decode_range(mainSheet['!ref']!);

console.log('=== MAIN DATA SHEET: HO&F_25.01~ ===');
console.log('Range:', mainSheet['!ref']);
console.log('Total Columns:', range.e.c + 1);

// Get header rows (rows 11-13 typically contain tier headers)
console.log('\n=== HEADER TIERS (Rows 11-13) ===');

// Collect all headers for analysis
const tier1Headers: string[] = [];
const tier2Headers: string[] = [];
const tier3Headers: string[] = [];

for (let col = 0; col <= range.e.c; col++) {
  const colLetter = XLSX.utils.encode_col(col);
  const t1Cell = mainSheet[XLSX.utils.encode_cell({ r: 10, c: col })];
  const t2Cell = mainSheet[XLSX.utils.encode_cell({ r: 11, c: col })];
  const t3Cell = mainSheet[XLSX.utils.encode_cell({ r: 12, c: col })];

  tier1Headers.push(t1Cell?.v?.toString() || '');
  tier2Headers.push(t2Cell?.v?.toString() || '');
  tier3Headers.push(t3Cell?.v?.toString() || '');
}

// Print combined header structure
console.log('\nColumn-by-column header structure:');
for (let col = 0; col <= range.e.c; col++) {
  const colLetter = XLSX.utils.encode_col(col);
  const t1 = tier1Headers[col] || '';
  const t2 = tier2Headers[col] || '';
  const t3 = tier3Headers[col] || '';

  if (t1 || t2 || t3) {
    console.log(`${colLetter.padEnd(3)} | ${t1.padEnd(20)} | ${t2.padEnd(25)} | ${t3}`);
  }
}

// Sample data rows (first 3 data rows starting from row 14)
console.log('\n\n=== SAMPLE DATA (Rows 14-16, first 20 cols) ===');
for (let row = 13; row <= 15; row++) {
  console.log(`\n--- Row ${row + 1} ---`);
  for (let col = 0; col <= Math.min(19, range.e.c); col++) {
    const colLetter = XLSX.utils.encode_col(col);
    const cell = mainSheet[XLSX.utils.encode_cell({ r: row, c: col })];
    const t3 = tier3Headers[col] || tier2Headers[col] || tier1Headers[col] || `Col${col}`;
    if (cell?.v !== undefined) {
      console.log(`  ${colLetter} (${t3}): ${cell.v}`);
    }
  }
}

// Analyze MDRT Rule sheet
console.log('\n\n=== MDRT기준(Rule) SHEET ===');
const ruleSheet = workbook.Sheets['MDRT기준(Rule)'];
if (ruleSheet) {
  const ruleData = XLSX.utils.sheet_to_json(ruleSheet, { header: 1 }) as unknown[][];
  ruleData.forEach((row, idx) => {
    const nonEmpty = (row as unknown[]).filter(v => v !== undefined && v !== '');
    if (nonEmpty.length > 0) {
      console.log(`Row ${idx + 1}: ${JSON.stringify(row)}`);
    }
  });
}

// Analyze 2026 MDRT 기준 sheet
console.log('\n\n=== 2026 MDRT 기준 SHEET ===');
const mdrt2026Sheet = workbook.Sheets['2026 MDRT 기준'];
if (mdrt2026Sheet) {
  const mdrt2026Data = XLSX.utils.sheet_to_json(mdrt2026Sheet, { header: 1 }) as unknown[][];
  mdrt2026Data.forEach((row, idx) => {
    const nonEmpty = (row as unknown[]).filter(v => v !== undefined && v !== '');
    if (nonEmpty.length > 0) {
      console.log(`Row ${idx + 1}: ${JSON.stringify(row)}`);
    }
  });
}

// Analyze 지사 sheet structure
console.log('\n\n=== HO&F_25.01~10월(지사) SHEET ===');
const jisaSheet = workbook.Sheets['HO&F_25.01~10월(지사)'];
if (jisaSheet) {
  const jisaRange = XLSX.utils.decode_range(jisaSheet['!ref']!);
  console.log('Range:', jisaSheet['!ref']);
  console.log('Rows:', jisaRange.e.r + 1, 'Columns:', jisaRange.e.c + 1);

  // Get headers from row 13
  console.log('\nHeaders (Row 13):');
  for (let col = 0; col <= Math.min(jisaRange.e.c, 30); col++) {
    const colLetter = XLSX.utils.encode_col(col);
    const cell = jisaSheet[XLSX.utils.encode_cell({ r: 12, c: col })];
    if (cell?.v) {
      console.log(`  ${colLetter}: ${cell.v}`);
    }
  }

  // Sample data
  console.log('\nSample data (Row 14):');
  for (let col = 0; col <= Math.min(jisaRange.e.c, 15); col++) {
    const cell = jisaSheet[XLSX.utils.encode_cell({ r: 13, c: col })];
    if (cell?.v !== undefined) {
      console.log(`  Col ${col}: ${cell.v}`);
    }
  }
}

// Output column mapping structure
console.log('\n\n=== DETAILED COLUMN MAPPING ===');

// Identify monthly column blocks by analyzing tier1 headers (which should contain month names)
const monthPattern = /(\d+)월/;
const months: { month: number; startCol: number; endCol: number }[] = [];
let currentMonth: number | null = null;
let startCol = -1;

for (let col = 8; col <= range.e.c; col++) {
  const t1 = tier1Headers[col];
  const match = t1?.match(monthPattern);

  if (match) {
    if (currentMonth !== null && startCol >= 0) {
      months.push({ month: currentMonth, startCol, endCol: col - 1 });
    }
    currentMonth = parseInt(match[1]);
    startCol = col;
  }
}
if (currentMonth !== null && startCol >= 0) {
  months.push({ month: currentMonth, startCol, endCol: range.e.c });
}

console.log('\nMonthly column blocks detected:');
months.forEach(m => {
  const startLetter = XLSX.utils.encode_col(m.startCol);
  const endLetter = XLSX.utils.encode_col(m.endCol);
  console.log(`  ${m.month}월: Columns ${startLetter}-${endLetter} (${m.startCol}-${m.endCol})`);

  // Show column structure for this month
  for (let col = m.startCol; col <= m.endCol; col++) {
    const colLetter = XLSX.utils.encode_col(col);
    const t2 = tier2Headers[col] || '';
    const t3 = tier3Headers[col] || '';
    console.log(`    ${colLetter}: ${t2} > ${t3}`);
  }
});

// Output the final column structure for the processor
console.log('\n\n=== PROCESSOR COLUMN STRUCTURE ===');
console.log('const BASE_COLUMNS = {');
console.log('  no: 0,          // A: 순번');
console.log('  branch: 1,      // B: 지사');
console.log('  team: 2,        // C: 지점');
console.log('  employeeId: 3,  // D: 사번');
console.log('  employeeName: 4,// E: 사원이름');
console.log('  jobType: 5,     // F: 직종');
console.log('  totalCommission: 6, // G: A.커미션');
console.log('  totalIncome: 7, // H: B.총수입');
console.log('};');

console.log('\nconst MONTHLY_COLUMN_OFFSETS = {');
if (months.length > 0) {
  const firstMonth = months[0];
  for (let col = firstMonth.startCol; col <= firstMonth.endCol; col++) {
    const offset = col - firstMonth.startCol;
    const t2 = tier2Headers[col] || '';
    const t3 = tier3Headers[col] || '';
    const key = (t2 + '_' + t3).replace(/[.\s\/]/g, '_').replace(/__+/g, '_').toLowerCase();
    console.log(`  ${offset}: '${t2} > ${t3}',`);
  }
}
console.log('};');
