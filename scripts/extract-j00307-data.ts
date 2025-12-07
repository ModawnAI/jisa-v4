/**
 * Focused extraction of J00307 정다운's actual data
 * Outputs exact values for RAG comparison
 */

import * as XLSX from 'xlsx';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EMPLOYEE_ID = 'J00307';
const EMPLOYEE_NAME = '정다운';

interface CompensationSummary {
  마감월: string;
  소속: string;
  사번: string;
  사원명: string;
  커미션계: number;
  오버라이드계: number;
  최종지급액: number;
  공제계: number;
  과세계: number;
  소득세: number;
  주민세: number;
}

interface ContractDetail {
  보험사: string;
  증권번호: string;
  계약일: string;
  상품명: string;
  보험료: number;
  MFYC: number;
  지급수수료합계: number;
  계약자: string;
  피보험자: string;
}

function extractCompensationData() {
  const filePath = path.join(DATA_DIR, '★202509마감_HO&F 건별 및 명세_20251023_배포용_수도권, AL (1).xlsx');
  const workbook = XLSX.readFile(filePath);

  console.log('\n' + '═'.repeat(80));
  console.log('📊 J00307 정다운 - COMPENSATION DATA EXTRACTION');
  console.log('═'.repeat(80));

  // 1. Extract "인별명세" (Summary)
  console.log('\n▶ Sheet: 인별명세 (개인별 수수료 명세)');
  console.log('-'.repeat(70));

  const summarySheet = workbook.Sheets['인별명세'];
  const summaryData = XLSX.utils.sheet_to_json(summarySheet, { defval: '' }) as Record<string, unknown>[];

  const summaryRecord = summaryData.find((r) => String(r['사번']) === EMPLOYEE_ID);

  if (summaryRecord) {
    console.log('\n📋 개인별 수수료 명세 (Summary):');
    console.log(`   마감월: ${summaryRecord['마감월']}`);
    console.log(`   소속: ${summaryRecord['소속']}`);
    console.log(`   소속경로: ${summaryRecord['소속경로']}`);
    console.log(`   직종: ${summaryRecord['직종']}`);
    console.log(`   사번: ${summaryRecord['사번']}`);
    console.log(`   사원명: ${summaryRecord['사원명']}`);
    console.log(`   위촉일: ${summaryRecord['위촉일']}`);

    console.log('\n💰 수수료 내역:');
    console.log(`   커미션계: ${Number(summaryRecord['커미션계']).toLocaleString()}원`);
    console.log(`   ├─ FC 커미션계: ${Number(summaryRecord['FC 커미션계']).toLocaleString()}원`);
    console.log(`   ├─ FC계약모집 커미션Ⅱ: ${Number(summaryRecord['FC계약모집 커미션Ⅱ']).toLocaleString()}원`);
    console.log(`   ├─ 현금시책: ${Number(summaryRecord['현금시책']).toLocaleString()}원`);
    console.log(`   └─ FC계약유지 및 서비스 커미션Ⅱ: ${Number(summaryRecord['FC계약유지 및 서비스 커미션Ⅱ']).toLocaleString()}원`);

    console.log(`\n   오버라이드계: ${Number(summaryRecord['오버라이드계']).toLocaleString()}원`);
    console.log(`   ├─ BM 오버라이드Ⅱ: ${Number(summaryRecord['BM 오버라이드Ⅱ']).toLocaleString()}원`);
    console.log(`   ├─ MD 오버라이드Ⅱ: ${Number(summaryRecord['MD 오버라이드Ⅱ']).toLocaleString()}원`);
    console.log(`   └─ 사업단장 오버라이드Ⅱ: ${Number(summaryRecord['사업단장 오버라이드Ⅱ']).toLocaleString()}원`);

    console.log('\n📌 공제 및 과세:');
    console.log(`   과세계: ${Number(summaryRecord['과세계']).toLocaleString()}원`);
    console.log(`   공제계: ${Number(summaryRecord['공제계']).toLocaleString()}원`);
    console.log(`   ├─ 소득세: ${Number(summaryRecord['소득세']).toLocaleString()}원`);
    console.log(`   ├─ 주민세: ${Number(summaryRecord['주민세']).toLocaleString()}원`);
    console.log(`   └─ 원천세: ${Number(summaryRecord['원천세']).toLocaleString()}원`);

    console.log('\n✅ 최종지급액: ' + Number(summaryRecord['최종지급액']).toLocaleString() + '원');

    // Store for return
    return {
      summary: {
        마감월: summaryRecord['마감월'],
        소속: summaryRecord['소속'],
        사번: summaryRecord['사번'],
        사원명: summaryRecord['사원명'],
        커미션계: Number(summaryRecord['커미션계']),
        FC커미션계: Number(summaryRecord['FC 커미션계']),
        오버라이드계: Number(summaryRecord['오버라이드계']),
        과세계: Number(summaryRecord['과세계']),
        공제계: Number(summaryRecord['공제계']),
        소득세: Number(summaryRecord['소득세']),
        주민세: Number(summaryRecord['주민세']),
        최종지급액: Number(summaryRecord['최종지급액']),
      },
      raw: summaryRecord,
    };
  } else {
    console.log('❌ No summary record found for J00307');
    return null;
  }
}

function extractContractData() {
  const filePath = path.join(DATA_DIR, '★202509마감_HO&F 건별 및 명세_20251023_배포용_수도권, AL (1).xlsx');
  const workbook = XLSX.readFile(filePath);

  console.log('\n\n▶ Sheet: 건별수수료 (계약건별 수수료)');
  console.log('-'.repeat(70));

  const contractSheet = workbook.Sheets['건별수수료'];
  const contractData = XLSX.utils.sheet_to_json(contractSheet, { defval: '' }) as Record<string, unknown>[];

  const contracts = contractData.filter((r) => String(r['지급사원번호']) === EMPLOYEE_ID);

  console.log(`\n📋 계약건별 수수료 내역 (${contracts.length}건):\n`);

  let totalCommission = 0;
  let totalMFYC = 0;
  let totalPremium = 0;

  contracts.forEach((contract, index) => {
    const commission = Number(contract['[지급수수료] 합계']) || 0;
    const mfyc = Number(contract['MFYC']) || 0;
    const premium = Number(contract['보험료']) || 0;

    totalCommission += commission;
    totalMFYC += mfyc;
    totalPremium += premium;

    console.log(`[계약 ${index + 1}]`);
    console.log(`   보험사: ${contract['보험사']}`);
    console.log(`   증권번호: ${contract['증권번호']}`);
    console.log(`   계약일: ${contract['계약일']}`);
    console.log(`   상품명: ${contract['상품명']}`);
    console.log(`   계약자: ${contract['계약자']}`);
    console.log(`   피보험자: ${contract['피보험자']}`);
    console.log(`   보험료: ${premium.toLocaleString()}원`);
    console.log(`   MFYC: ${mfyc.toLocaleString()}원`);
    console.log(`   지급수수료 합계: ${commission.toLocaleString()}원`);
    console.log(`   ├─ 모집: ${Number(contract['[지급수수료] 모집']).toLocaleString()}원`);
    console.log(`   ├─ 유지: ${Number(contract['[지급수수료] 유지']).toLocaleString()}원`);
    console.log(`   └─ 일반: ${Number(contract['[지급수수료] 일반']).toLocaleString()}원`);
    console.log('');
  });

  console.log('-'.repeat(50));
  console.log(`📊 계약건 합계:`);
  console.log(`   총 계약건수: ${contracts.length}건`);
  console.log(`   총 보험료: ${totalPremium.toLocaleString()}원`);
  console.log(`   총 MFYC: ${totalMFYC.toLocaleString()}원`);
  console.log(`   총 지급수수료: ${totalCommission.toLocaleString()}원`);

  return {
    contracts: contracts.map((c) => ({
      보험사: c['보험사'],
      증권번호: c['증권번호'],
      계약일: c['계약일'],
      상품명: c['상품명'],
      계약자: c['계약자'],
      피보험자: c['피보험자'],
      보험료: Number(c['보험료']),
      MFYC: Number(c['MFYC']),
      지급수수료합계: Number(c['[지급수수료] 합계']),
      모집: Number(c['[지급수수료] 모집']),
      유지: Number(c['[지급수수료] 유지']),
      일반: Number(c['[지급수수료] 일반']),
    })),
    totals: {
      계약건수: contracts.length,
      총보험료: totalPremium,
      총MFYC: totalMFYC,
      총지급수수료: totalCommission,
    },
  };
}

function extractMDRTData() {
  const filePath = path.join(DATA_DIR, '전달용▶HO&F_MDRT_커미션,총수입 산출금액_2025년_4분기_251114_공유용 (1).xlsx');
  const workbook = XLSX.readFile(filePath);

  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 J00307 정다운 - MDRT DATA EXTRACTION');
  console.log('═'.repeat(80));

  // MDRT file has merged cells, need to read raw with header option
  const mdrtSheet = workbook.Sheets['HO&F_25.01~'];

  // Read as array of arrays to handle merged cells
  const rawData = XLSX.utils.sheet_to_json(mdrtSheet, { header: 1, defval: '' }) as unknown[][];

  console.log('\n▶ Sheet: HO&F_25.01~ (MDRT 실적)');
  console.log('-'.repeat(70));

  // Find header row (usually row 2-4 in Korean Excel files)
  let headerRowIndex = -1;
  let employeeRowIndex = -1;

  for (let i = 0; i < Math.min(rawData.length, 20); i++) {
    const row = rawData[i];
    const rowStr = row.join(' ');

    // Look for header indicators
    if (rowStr.includes('사번') || rowStr.includes('이름') || rowStr.includes('사원명')) {
      headerRowIndex = i;
      console.log(`   Header found at row ${i + 1}`);
    }

    // Look for J00307 or 정다운
    if (rowStr.includes(EMPLOYEE_ID) || rowStr.includes(EMPLOYEE_NAME)) {
      employeeRowIndex = i;
      console.log(`   Employee data found at row ${i + 1}`);
    }
  }

  // If not found in first 20 rows, search all
  if (employeeRowIndex === -1) {
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowStr = row.join(' ');
      if (rowStr.includes(EMPLOYEE_ID) || rowStr.includes(EMPLOYEE_NAME)) {
        employeeRowIndex = i;
        console.log(`   Employee data found at row ${i + 1}`);
        break;
      }
    }
  }

  if (employeeRowIndex !== -1 && headerRowIndex !== -1) {
    const headerRow = rawData[headerRowIndex];
    const dataRow = rawData[employeeRowIndex];

    console.log('\n📋 MDRT 실적 데이터:');

    // Match headers with values
    const mdrtData: Record<string, unknown> = {};
    for (let i = 0; i < headerRow.length; i++) {
      const header = String(headerRow[i]).trim();
      if (header && header !== '') {
        mdrtData[header] = dataRow[i];
      }
    }

    // Print key MDRT metrics
    console.log('\n   Key MDRT Metrics:');
    for (const [key, value] of Object.entries(mdrtData)) {
      if (key.includes('FYC') || key.includes('FYP') || key.includes('커미션') ||
          key.includes('총수입') || key.includes('달성') || key.includes('실적')) {
        const numVal = Number(value);
        if (!isNaN(numVal) && numVal !== 0) {
          console.log(`   ${key}: ${numVal.toLocaleString()}`);
        }
      }
    }

    return mdrtData;
  } else {
    // Alternative: try reading with raw cell access
    console.log('\n   Trying alternative parsing method...');

    // Search through all cells
    const range = XLSX.utils.decode_range(mdrtSheet['!ref'] || 'A1:A1');

    for (let row = range.s.r; row <= Math.min(range.e.r, 100); row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = mdrtSheet[cellAddr];
        if (cell && (String(cell.v).includes(EMPLOYEE_ID) || String(cell.v).includes(EMPLOYEE_NAME))) {
          console.log(`   Found at cell ${cellAddr}: ${cell.v}`);

          // Print entire row
          const rowData: unknown[] = [];
          for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r: row, c: c });
            const cellVal = mdrtSheet[addr];
            if (cellVal) rowData.push(cellVal.v);
          }
          console.log(`   Row data: ${JSON.stringify(rowData.slice(0, 20))}`);
        }
      }
    }
  }

  return null;
}

// Main execution
console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║   COMPREHENSIVE DATA EXTRACTION: J00307 정다운                                ║');
console.log('║   Source: /data/*.xlsx files                                                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

const summaryData = extractCompensationData();
const contractData = extractContractData();
const mdrtData = extractMDRTData();

// Final summary for RAG comparison
console.log('\n\n' + '═'.repeat(80));
console.log('📋 FINAL DATA SUMMARY FOR RAG COMPARISON');
console.log('═'.repeat(80));

if (summaryData) {
  console.log('\n🔢 Key Values to Compare with RAG:');
  console.log(`   • 커미션계: ${summaryData.summary.커미션계.toLocaleString()}원`);
  console.log(`   • FC커미션계: ${summaryData.summary.FC커미션계.toLocaleString()}원`);
  console.log(`   • 오버라이드계: ${summaryData.summary.오버라이드계.toLocaleString()}원`);
  console.log(`   • 과세계: ${summaryData.summary.과세계.toLocaleString()}원`);
  console.log(`   • 공제계: ${summaryData.summary.공제계.toLocaleString()}원`);
  console.log(`   • 소득세: ${summaryData.summary.소득세.toLocaleString()}원`);
  console.log(`   • 주민세: ${summaryData.summary.주민세.toLocaleString()}원`);
  console.log(`   • 최종지급액: ${summaryData.summary.최종지급액.toLocaleString()}원`);
}

if (contractData) {
  console.log(`\n   • 계약건수: ${contractData.totals.계약건수}건`);
  console.log(`   • 총보험료: ${contractData.totals.총보험료.toLocaleString()}원`);
  console.log(`   • 총MFYC: ${contractData.totals.총MFYC.toLocaleString()}원`);
  console.log(`   • 총지급수수료(건별합계): ${contractData.totals.총지급수수료.toLocaleString()}원`);
}

console.log('\n✅ Data extraction complete!');
console.log('   Use these values to verify RAG responses.\n');
