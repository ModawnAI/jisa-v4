import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = '/Users/paksungho/jisa-v4/data/전달용▶HO&F_MDRT_커미션,총수입 산출금액_2025년_4분기_251114_공유용 (1).xlsx';

const workbook = XLSX.read(fs.readFileSync(filePath));
const mainSheet = workbook.Sheets['HO&F_25.01~'];
const range = XLSX.utils.decode_range(mainSheet['!ref']!);

console.log('=== MDRT EXCEL HEADER STRUCTURE ANALYSIS ===\n');
console.log('Total Columns:', range.e.c + 1);

// Print all rows from 11-17 to understand header structure
console.log('\n=== ROWS 11-17 STRUCTURE ===');
for (let row = 10; row <= 17; row++) {
  console.log(`\n--- Row ${row + 1} ---`);
  for (let col = 0; col <= Math.min(30, range.e.c); col++) {
    const cell = mainSheet[XLSX.utils.encode_cell({ r: row, c: col })];
    if (cell?.v !== undefined && cell.v !== '') {
      const colLetter = XLSX.utils.encode_col(col);
      console.log(`  ${colLetter} (${col}): ${cell.v}`);
    }
  }
}

// Identify actual header row and data start
console.log('\n\n=== FINDING DATA START ROW ===');
for (let row = 15; row <= 20; row++) {
  const colA = mainSheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
  const colB = mainSheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
  const colC = mainSheet[XLSX.utils.encode_cell({ r: row, c: 2 })];
  const colD = mainSheet[XLSX.utils.encode_cell({ r: row, c: 3 })];
  const colE = mainSheet[XLSX.utils.encode_cell({ r: row, c: 4 })];

  console.log(`Row ${row + 1}: A=${colA?.v || ''}, B=${colB?.v || ''}, C=${colC?.v || ''}, D=${colD?.v || ''}, E=${colE?.v || ''}`);

  // Check if this looks like data (numeric in column D which should be employee ID)
  if (colD?.v && typeof colD.v === 'number') {
    console.log(`  -> DATA ROW DETECTED!`);
  }
}

// Get all unique column headers by merging rows 14-16
console.log('\n\n=== COMBINED HEADERS (Rows 14-16 merged) ===');
interface HeaderInfo {
  col: number;
  letter: string;
  month?: string;
  category?: string;
  subcategory?: string;
}

const headers: HeaderInfo[] = [];
let currentMonth = '';

for (let col = 0; col <= range.e.c; col++) {
  const colLetter = XLSX.utils.encode_col(col);
  const r14 = mainSheet[XLSX.utils.encode_cell({ r: 13, c: col })]?.v?.toString() || '';
  const r15 = mainSheet[XLSX.utils.encode_cell({ r: 14, c: col })]?.v?.toString() || '';
  const r16 = mainSheet[XLSX.utils.encode_cell({ r: 15, c: col })]?.v?.toString() || '';

  // Track month from row 14
  if (r14.includes('월')) {
    currentMonth = r14;
  }

  // Build header info
  const header: HeaderInfo = {
    col,
    letter: colLetter,
    month: currentMonth || undefined,
    category: r15 || undefined,
    subcategory: r16 || undefined,
  };

  if (col <= 11 || header.category || header.subcategory) {
    headers.push(header);
  }
}

// Print first 40 headers for analysis
console.log('\nFirst 40 column headers:');
headers.slice(0, 40).forEach(h => {
  console.log(`  ${h.letter.padEnd(3)} | month: ${(h.month || '').padEnd(25)} | cat: ${(h.category || '').padEnd(15)} | sub: ${h.subcategory || ''}`);
});

// Analyze monthly block structure
console.log('\n\n=== MONTHLY BLOCK STRUCTURE ===');
const monthBlocks: { month: string; startCol: number; columns: { col: number; category: string; subcategory: string }[] }[] = [];
let currentBlock: { month: string; startCol: number; columns: { col: number; category: string; subcategory: string }[] } | null = null;

for (let col = 8; col <= range.e.c; col++) {
  const r14 = mainSheet[XLSX.utils.encode_cell({ r: 13, c: col })]?.v?.toString() || '';
  const r15 = mainSheet[XLSX.utils.encode_cell({ r: 14, c: col })]?.v?.toString() || '';
  const r16 = mainSheet[XLSX.utils.encode_cell({ r: 15, c: col })]?.v?.toString() || '';

  if (r14.includes('월')) {
    // New month block
    if (currentBlock) {
      monthBlocks.push(currentBlock);
    }
    currentBlock = {
      month: r14,
      startCol: col,
      columns: [],
    };
  }

  if (currentBlock && (r15 || r16)) {
    currentBlock.columns.push({
      col,
      category: r15,
      subcategory: r16,
    });
  }
}
if (currentBlock) {
  monthBlocks.push(currentBlock);
}

console.log(`Found ${monthBlocks.length} month blocks:`);
monthBlocks.forEach((block, idx) => {
  console.log(`\n${idx + 1}. ${block.month} (starts at col ${XLSX.utils.encode_col(block.startCol)})`);
  block.columns.forEach(col => {
    console.log(`   ${XLSX.utils.encode_col(col.col)}: ${col.category} > ${col.subcategory}`);
  });
});

// Get sample data row to verify structure
console.log('\n\n=== SAMPLE DATA ROW 18 (First data row) ===');
for (let col = 0; col <= Math.min(25, range.e.c); col++) {
  const cell = mainSheet[XLSX.utils.encode_cell({ r: 17, c: col })];
  if (cell?.v !== undefined) {
    const colLetter = XLSX.utils.encode_col(col);
    console.log(`  ${colLetter}: ${cell.v}`);
  }
}

// Output final structure for processor
console.log('\n\n=== FINAL COLUMN STRUCTURE FOR PROCESSOR ===');

// Base columns
console.log('Base Columns (A-K):');
const baseMapping: { [key: string]: { col: number; header: string } } = {};
for (let col = 0; col <= 11; col++) {
  const r14 = mainSheet[XLSX.utils.encode_cell({ r: 13, c: col })]?.v?.toString() || '';
  const r15 = mainSheet[XLSX.utils.encode_cell({ r: 14, c: col })]?.v?.toString() || '';
  const r16 = mainSheet[XLSX.utils.encode_cell({ r: 15, c: col })]?.v?.toString() || '';
  const header = r16 || r15 || r14;
  if (header) {
    console.log(`  Col ${XLSX.utils.encode_col(col)}: ${header}`);
  }
}

// Monthly structure
if (monthBlocks.length > 0) {
  console.log('\nMonthly Column Pattern (from first month block):');
  const firstBlock = monthBlocks[0];
  firstBlock.columns.forEach((col, idx) => {
    console.log(`  offset ${idx}: ${col.category} > ${col.subcategory}`);
  });
  console.log(`\nColumns per month: ${firstBlock.columns.length}`);
}

// MDRT Thresholds
console.log('\n\n=== MDRT THRESHOLDS (from Rule sheet) ===');
const ruleSheet = workbook.Sheets['MDRT기준(Rule)'];
if (ruleSheet) {
  // Extract thresholds
  const thresholds = {
    fyc: {
      onPace: ruleSheet['A4']?.v,
      mdrt: ruleSheet['A5']?.v,
      cot: ruleSheet['A6']?.v,
      tot: ruleSheet['A7']?.v,
    },
    agi: {
      onPace: ruleSheet['F4']?.v,
      mdrt: ruleSheet['F5']?.v,
      cot: ruleSheet['F6']?.v,
      tot: ruleSheet['F7']?.v,
    },
  };
  console.log('FYC (First Year Commission) Thresholds:');
  console.log(`  On-Pace: ${thresholds.fyc.onPace?.toLocaleString()}`);
  console.log(`  MDRT:    ${thresholds.fyc.mdrt?.toLocaleString()}`);
  console.log(`  COT:     ${thresholds.fyc.cot?.toLocaleString()}`);
  console.log(`  TOT:     ${thresholds.fyc.tot?.toLocaleString()}`);

  console.log('\nAGI (Adjusted Gross Income) Thresholds:');
  console.log(`  On-Pace: ${thresholds.agi.onPace?.toLocaleString()}`);
  console.log(`  MDRT:    ${thresholds.agi.mdrt?.toLocaleString()}`);
  console.log(`  COT:     ${thresholds.agi.cot?.toLocaleString()}`);
  console.log(`  TOT:     ${thresholds.agi.tot?.toLocaleString()}`);
}
