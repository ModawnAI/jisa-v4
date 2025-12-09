/**
 * Ground Truth Extraction Script
 *
 * Extracts verified data from Excel files to use as ground truth
 * for RAG evaluation tests.
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Data directory
const DATA_DIR = path.join(process.cwd(), 'data');

// Output file for ground truth
const GROUND_TRUTH_FILE = path.join(
  process.cwd(),
  'tests/rag-evaluation/ground-truth.json'
);

// Types for ground truth data
interface EmployeeData {
  sabon: string; // Employee ID (J00001, etc.)
  name: string;
  jobType: string; // 사업본부장, AM, SM, LP
  branch: string;
  office: string;
  commission: {
    total: number;
    保障性금액: number;
  };
  totalIncome: {
    total: number;
    신계약수입: number;
    보장성금액: number;
  };
  monthlyData: {
    [month: string]: {
      commission: number;
      보장성금액: number;
      totalIncome: number;
      신계약수입: number;
      총수입보장성: number;
    };
  };
  selfContract?: {
    commission: {
      total: number;
      included: number;
    };
    totalIncome: {
      total: number;
      included: number;
    };
  };
}

interface CompensationDetail {
  sabon: string;
  name: string;
  period: string;
  team: string;
  jobType: string;
  commissionTotal: number;
  transactions: Array<{
    insuranceCompany: string;
    policyNumber: string;
    contractDate: string;
    status: string;
    paymentRound: number;
    premium: number;
    commission: number;
  }>;
}

interface InsuranceCommissionRate {
  company: string;
  productName: string;
  paymentPeriod: string;
  rates: {
    firstYear: number;
    secondYear13: number;
    subsequent: number;
  };
}

interface PolicyAnnouncement {
  insuranceCompany: string;
  period: string;
  effectiveDate: string;
  products: Array<{
    name: string;
    paymentPeriod: string;
    totalRate: number;
    fcRate: number;
    branchRate: number;
  }>;
  clawbackRules: Array<{
    round: number;
    rate: number;
  }>;
}

interface GroundTruth {
  extractedAt: string;
  employees: EmployeeData[];
  compensationDetails: CompensationDetail[];
  commissionRates: InsuranceCommissionRate[];
  mdrtStandards: {
    year: number;
    requirements: {
      commission: number;
      premium: number;
      income: number;
    };
    cot: {
      commission: number;
      premium: number;
      income: number;
    };
    tot: {
      commission: number;
      premium: number;
      income: number;
    };
  };
  aggregations: {
    totalEmployees: number;
    totalCommission: number;
    totalIncome: number;
    byJobType: {
      [jobType: string]: {
        count: number;
        totalCommission: number;
        avgCommission: number;
      };
    };
    byMonth: {
      [month: string]: {
        totalCommission: number;
        totalIncome: number;
      };
    };
  };
}

/**
 * Extract MDRT employee data
 */
function extractMdrtData(): EmployeeData[] {
  const filePath = path.join(
    DATA_DIR,
    '전달용▶HO&F_MDRT_커미션,총수입 산출금액_2025년_4분기_251114_공유용 (1).xlsx'
  );

  if (!fs.existsSync(filePath)) {
    console.warn('MDRT file not found:', filePath);
    return [];
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = 'HO&F_25.01~';
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    console.warn('Sheet not found:', sheetName);
    return [];
  }

  // Convert to JSON with header row at row 14 (0-indexed: row 13)
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

  const employees: EmployeeData[] = [];

  // Data starts at row 17 (index 16)
  for (let i = 16; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || !row[4]) continue; // Skip if no 사번 (column 4)

    const sabon = String(row[4] || '').trim();
    if (!sabon.startsWith('J')) continue; // Skip non-employee rows

    const employee: EmployeeData = {
      sabon,
      name: String(row[5] || ''),
      jobType: String(row[6] || ''),
      branch: String(row[2] || ''),
      office: String(row[3] || ''),
      commission: {
        total: parseFloat(row[7] as string) || 0,
        保障性금액: parseFloat(row[8] as string) || 0,
      },
      totalIncome: {
        total: parseFloat(row[9] as string) || 0,
        신계약수입: parseFloat(row[10] as string) || 0,
        보장성금액: parseFloat(row[11] as string) || 0,
      },
      monthlyData: {},
    };

    // Extract monthly data (columns 12-71 contain monthly breakdowns, 5 cols per month)
    const months = [
      '1월',
      '2월',
      '3월',
      '4월',
      '5월',
      '6월',
      '7월',
      '8월',
      '9월',
      '10월',
      '11월',
      '12월',
    ];

    let colIdx = 12; // Start of monthly data (column 12 for 1월)
    for (const month of months) {
      if (colIdx + 4 < row.length) {
        employee.monthlyData[month] = {
          commission: parseFloat(row[colIdx] as string) || 0,
          보장성금액: parseFloat(row[colIdx + 1] as string) || 0,
          totalIncome: parseFloat(row[colIdx + 2] as string) || 0,
          신계약수입: parseFloat(row[colIdx + 3] as string) || 0,
          총수입보장성: parseFloat(row[colIdx + 4] as string) || 0,
        };
      }
      colIdx += 5;
    }

    // Self contract data (columns 72-75)
    if (row.length > 75 && row[72] !== undefined) {
      employee.selfContract = {
        commission: {
          total: parseFloat(row[72] as string) || 0,
          included: parseFloat(row[73] as string) || 0,
        },
        totalIncome: {
          total: parseFloat(row[74] as string) || 0,
          included: parseFloat(row[75] as string) || 0,
        },
      };
    }

    employees.push(employee);
  }

  return employees;
}

/**
 * Extract compensation detail data
 */
function extractCompensationDetails(): CompensationDetail[] {
  const filePath = path.join(
    DATA_DIR,
    '★202509마감_HO&F 건별 및 명세_20251023_배포용_수도권, AL (1).xlsx'
  );

  if (!fs.existsSync(filePath)) {
    console.warn('Compensation detail file not found:', filePath);
    return [];
  }

  const workbook = XLSX.readFile(filePath);
  const details: CompensationDetail[] = [];

  // Extract from 인별명세 sheet (per-person summary)
  const summarySheet = workbook.Sheets['인별명세'];
  if (summarySheet) {
    const summaryData = XLSX.utils.sheet_to_json(summarySheet, {
      header: 1,
    }) as unknown[][];

    for (let i = 1; i < summaryData.length; i++) {
      const row = summaryData[i];
      if (!row || !row[5]) continue;

      const sabon = String(row[5] || '').trim();
      if (!sabon.startsWith('J')) continue;

      details.push({
        sabon,
        name: String(row[6] || ''),
        period: String(row[0] || ''),
        team: String(row[1] || ''),
        jobType: String(row[3] || ''),
        commissionTotal: parseFloat(row[14] as string) || 0,
        transactions: [],
      });
    }
  }

  // Extract transaction details from 건별수수료 sheet
  const transactionSheet = workbook.Sheets['건별수수료'];
  if (transactionSheet) {
    const txData = XLSX.utils.sheet_to_json(transactionSheet, {
      header: 1,
    }) as unknown[][];

    for (let i = 1; i < txData.length; i++) {
      const row = txData[i];
      if (!row || !row[1]) continue;

      const sabon = String(row[1] || '').trim();
      if (!sabon.startsWith('J')) continue;

      // Find matching employee detail
      const empDetail = details.find((d) => d.sabon === sabon);
      if (empDetail) {
        empDetail.transactions.push({
          insuranceCompany: String(row[4] || ''),
          policyNumber: String(row[5] || ''),
          contractDate: String(row[6] || ''),
          status: String(row[7] || ''),
          paymentRound: parseInt(row[8] as string) || 0,
          premium: parseFloat(row[14] as string) || 0,
          commission: parseFloat(row[15] as string) || 0, // Actual column may vary
        });
      }
    }
  }

  return details;
}

/**
 * Extract insurance commission rates from FC commission file
 */
function extractCommissionRates(): InsuranceCommissionRate[] {
  const filePath = path.join(
    DATA_DIR,
    'everyone/FC 11월 HO&F수수료(생,손보 통합)_25-1107 (2).xlsx'
  );

  if (!fs.existsSync(filePath)) {
    console.warn('FC commission file not found:', filePath);
    return [];
  }

  const workbook = XLSX.readFile(filePath);
  const rates: InsuranceCommissionRate[] = [];

  // Extract from KB라이프 sheet as example
  const kbSheet = workbook.Sheets['KB라이프'];
  if (kbSheet) {
    const kbData = XLSX.utils.sheet_to_json(kbSheet, { header: 1 }) as unknown[][];

    for (let i = 11; i < kbData.length; i++) {
      const row = kbData[i];
      if (!row || !row[0]) continue;

      const productName = String(row[0] || '').trim();
      if (!productName || productName === 'NaN') continue;

      rates.push({
        company: 'KB라이프',
        productName,
        paymentPeriod: String(row[1] || ''),
        rates: {
          firstYear: parseFloat(row[5] as string) || 0,
          secondYear13: parseFloat(row[7] as string) || 0,
          subsequent: parseFloat(row[8] as string) || 0,
        },
      });
    }
  }

  return rates;
}

/**
 * Calculate aggregations from employee data
 */
function calculateAggregations(employees: EmployeeData[]): GroundTruth['aggregations'] {
  const byJobType: GroundTruth['aggregations']['byJobType'] = {};
  const byMonth: GroundTruth['aggregations']['byMonth'] = {};

  let totalCommission = 0;
  let totalIncome = 0;

  for (const emp of employees) {
    totalCommission += emp.commission.total;
    totalIncome += emp.totalIncome.total;

    // By job type
    if (!byJobType[emp.jobType]) {
      byJobType[emp.jobType] = {
        count: 0,
        totalCommission: 0,
        avgCommission: 0,
      };
    }
    byJobType[emp.jobType].count++;
    byJobType[emp.jobType].totalCommission += emp.commission.total;

    // By month
    for (const [month, data] of Object.entries(emp.monthlyData)) {
      if (!byMonth[month]) {
        byMonth[month] = {
          totalCommission: 0,
          totalIncome: 0,
        };
      }
      byMonth[month].totalCommission += data.commission;
      byMonth[month].totalIncome += data.totalIncome;
    }
  }

  // Calculate averages
  for (const jobType in byJobType) {
    byJobType[jobType].avgCommission =
      byJobType[jobType].totalCommission / byJobType[jobType].count;
  }

  return {
    totalEmployees: employees.length,
    totalCommission,
    totalIncome,
    byJobType,
    byMonth,
  };
}

/**
 * Main extraction function
 */
export async function extractGroundTruth(): Promise<GroundTruth> {
  console.log('Extracting ground truth data...');

  const employees = extractMdrtData();
  console.log(`Extracted ${employees.length} employees from MDRT data`);

  const compensationDetails = extractCompensationDetails();
  console.log(`Extracted ${compensationDetails.length} compensation details`);

  const commissionRates = extractCommissionRates();
  console.log(`Extracted ${commissionRates.length} commission rate entries`);

  const aggregations = calculateAggregations(employees);

  const groundTruth: GroundTruth = {
    extractedAt: new Date().toISOString(),
    employees,
    compensationDetails,
    commissionRates,
    mdrtStandards: {
      year: 2026,
      requirements: {
        commission: 122455000, // MDRT 2026 기준
        premium: 0,
        income: 244910000,
      },
      cot: {
        commission: 367365000, // COT is 3x MDRT
        premium: 0,
        income: 734730000,
      },
      tot: {
        commission: 734730000, // TOT is 6x MDRT
        premium: 0,
        income: 1469460000,
      },
    },
    aggregations,
  };

  return groundTruth;
}

/**
 * Save ground truth to file
 */
export async function saveGroundTruth(): Promise<void> {
  const groundTruth = await extractGroundTruth();

  fs.writeFileSync(GROUND_TRUTH_FILE, JSON.stringify(groundTruth, null, 2), 'utf-8');
  console.log(`Ground truth saved to: ${GROUND_TRUTH_FILE}`);
}

// Run if executed directly
if (require.main === module) {
  saveGroundTruth().catch(console.error);
}
