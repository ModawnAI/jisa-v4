import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = '/Users/paksungho/jisa-v4/data/전달용▶HO&F_MDRT_커미션,총수입 산출금액_2025년_4분기_251114_공유용 (1).xlsx';
const workbook = XLSX.read(fs.readFileSync(filePath));
const ruleSheet = workbook.Sheets['MDRT기준(Rule)'];

if (ruleSheet) {
  console.log('=== MDRT Rule Sheet Analysis ===\n');
  const range = XLSX.utils.decode_range(ruleSheet['!ref'] || 'A1');
  console.log('Range:', ruleSheet['!ref']);

  // Print all non-empty cells
  for (let row = 0; row <= Math.min(15, range.e.r); row++) {
    for (let col = 0; col <= Math.min(15, range.e.c); col++) {
      const cell = ruleSheet[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell?.v !== undefined && cell.v !== '') {
        const colLetter = XLSX.utils.encode_col(col);
        console.log(`${colLetter}${row + 1}: ${cell.v} (type: ${typeof cell.v})`);
      }
    }
  }

  // Specifically check key cells
  console.log('\n=== Expected Threshold Cells ===');
  const keyCells = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'];
  for (const addr of keyCells) {
    const cell = ruleSheet[addr];
    console.log(`${addr}: ${cell?.v ?? 'empty'} (${typeof cell?.v})`);
  }
} else {
  console.log('Rule sheet not found');
}
