#!/usr/bin/env python3
"""
Combined Excel to Pinecone Pipeline
====================================

This script combines:
1. Excel parsing (from pinecone_data_structure.py)
2. Secure Pinecone upload (from secure_pinecone_upload.py)

Usage:
    python3 combined_excel_to_pinecone.py

Prerequisites:
    export PINECONE_API_KEY="your-api-key"
    export OPENAI_API_KEY="your-api-key"

    pip install pandas openpyxl pinecone-client openai tqdm python-dotenv
"""

import pandas as pd
import numpy as np
import json
import os
import sys
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path
from tqdm import tqdm

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Loaded .env file")
except ImportError:
    print("⚠️  python-dotenv not installed, using system environment variables only")

# Check for required packages
try:
    from pinecone import Pinecone, ServerlessSpec
except ImportError:
    print("❌ Error: pinecone-client not installed")
    print("Install with: pip install pinecone-client")
    sys.exit(1)

try:
    from openai import OpenAI
except ImportError:
    print("❌ Error: openai not installed")
    print("Install with: pip install openai")
    sys.exit(1)


# =============================================================================
# PART 1: DATA STRUCTURES
# =============================================================================

class EmployeeDataStructure:
    """Comprehensive employee data structure for Pinecone"""

    def __init__(self):
        self.sabon: str = ""  # 사번
        self.employee_profile: Dict[str, Any] = {}
        self.commission_contracts: List[Dict[str, Any]] = []
        self.override_records: List[Dict[str, Any]] = []
        self.policy_contracts: List[Dict[str, Any]] = []
        self.performance_records: List[Dict[str, Any]] = []
        self.additional_allowances: Dict[str, Any] = {}
        self.clawback_records: List[Dict[str, Any]] = []
        self.summary_financials: Dict[str, float] = {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Pinecone storage"""
        return {
            "sabon": self.sabon,
            "employee_profile": self.employee_profile,
            "commission_contracts": self.commission_contracts,
            "override_records": self.override_records,
            "policy_contracts": self.policy_contracts,
            "performance_records": self.performance_records,
            "additional_allowances": self.additional_allowances,
            "clawback_records": self.clawback_records,
            "summary_financials": self.summary_financials
        }

    def to_text_for_embedding(self) -> str:
        """Convert to comprehensive text representation for embedding"""
        parts = []

        # Employee Profile
        if self.employee_profile:
            parts.append(f"사번: {self.sabon}")
            parts.append(f"사원명: {self.employee_profile.get('사원명', '')}")
            parts.append(f"직종: {self.employee_profile.get('직종', '')}")
            parts.append(f"소속: {self.employee_profile.get('소속', '')}")
            parts.append(f"소속경로: {self.employee_profile.get('소속경로', '')}")
            parts.append(f"위촉일: {self.employee_profile.get('위촉일', '')}")
            parts.append(f"위촉구분: {self.employee_profile.get('위촉구분', '')}")

        # Summary Financials
        if self.summary_financials:
            parts.append("\n## 재무 요약")
            parts.append(f"최종지급액: {self.summary_financials.get('최종지급액', 0):,.0f}원")
            parts.append(f"총 커미션: {self.summary_financials.get('총_커미션', 0):,.0f}원")
            parts.append(f"총 오버라이드: {self.summary_financials.get('총_오버라이드', 0):,.0f}원")
            parts.append(f"총 시책금액: {self.summary_financials.get('총_시책금액', 0):,.0f}원")
            parts.append(f"총 환수금액: {self.summary_financials.get('총_환수금액', 0):,.0f}원")

        # Commission Contracts Summary
        if self.commission_contracts:
            parts.append(f"\n## 수수료 계약: {len(self.commission_contracts)}건")
            total_commission = sum(c.get('지급수수료_합계', 0) for c in self.commission_contracts)
            parts.append(f"총 수수료: {total_commission:,.0f}원")

            # Group by insurance company
            by_insurer = {}
            for contract in self.commission_contracts:
                insurer = contract.get('보험사', '')
                if insurer not in by_insurer:
                    by_insurer[insurer] = []
                by_insurer[insurer].append(contract)

            parts.append("보험사별 계약:")
            for insurer, contracts in by_insurer.items():
                count = len(contracts)
                amount = sum(c.get('지급수수료_합계', 0) for c in contracts)
                parts.append(f"  - {insurer}: {count}건, {amount:,.0f}원")

        # Override Records
        if self.override_records:
            parts.append(f"\n## 오버라이드: {len(self.override_records)}건")
            total_override = sum(o.get('오버라이드_금액', 0) for o in self.override_records)
            parts.append(f"총 오버라이드: {total_override:,.0f}원")

            by_type = {}
            for override in self.override_records:
                otype = override.get('오버라이드_종류', '')
                if otype not in by_type:
                    by_type[otype] = []
                by_type[otype].append(override)

            for otype, records in by_type.items():
                count = len(records)
                amount = sum(r.get('오버라이드_금액', 0) for r in records)
                parts.append(f"  - {otype}: {count}건, {amount:,.0f}원")

        # Policy Contracts
        if self.policy_contracts:
            parts.append(f"\n## 시책 계약: {len(self.policy_contracts)}건")
            total_policy = sum(p.get('지급_계', 0) for p in self.policy_contracts)
            parts.append(f"총 시책금액: {total_policy:,.0f}원")

        # Additional Allowances
        if self.additional_allowances:
            parts.append("\n## 추가 수당")
            for key, value in self.additional_allowances.items():
                if isinstance(value, (int, float)) and value > 0:
                    parts.append(f"  - {key}: {value:,.0f}원")
                elif isinstance(value, dict) and value.get('금액', 0) > 0:
                    parts.append(f"  - {key}: {value.get('금액', 0):,.0f}원")

        # Clawback Records
        if self.clawback_records:
            parts.append(f"\n## 환수 기록: {len(self.clawback_records)}건")
            total_clawback = sum(c.get('환수금액', 0) for c in self.clawback_records)
            parts.append(f"총 환수금액: {total_clawback:,.0f}원")

            by_type = {}
            for clawback in self.clawback_records:
                ctype = clawback.get('환수유형', '')
                if ctype not in by_type:
                    by_type[ctype] = 0
                by_type[ctype] += clawback.get('환수금액', 0)

            for ctype, amount in by_type.items():
                parts.append(f"  - {ctype}: {amount:,.0f}원")

        # Performance Summary
        if self.performance_records:
            parts.append(f"\n## 업적 기록: {len(self.performance_records)}건")

        return "\n".join(parts)


# =============================================================================
# PART 2: EXCEL PROCESSOR
# =============================================================================

class ExcelDataProcessor:
    """Process Excel sheets and create employee-centric data structures"""

    def __init__(self, excel_path: str):
        self.excel_path = excel_path
        self.xl = pd.ExcelFile(excel_path)
        self.employees: Dict[str, EmployeeDataStructure] = {}

    def safe_read_sheet(self, sheet_name: str, header: int = 0, **kwargs) -> pd.DataFrame:
        """Safely read a sheet with error handling"""
        try:
            df = pd.read_excel(self.excel_path, sheet_name=sheet_name, header=header, **kwargs)
            df = df.replace({np.nan: None})
            return df
        except Exception as e:
            print(f"  ⚠ Error reading sheet {sheet_name}: {e}")
            return pd.DataFrame()

    def process_individual_statements(self):
        """Process 인별명세 (Individual Statement)"""
        print("Processing 인별명세 (Individual Statement)...")
        df = self.safe_read_sheet('인별명세')

        for _, row in df.iterrows():
            sabon = str(row['사번'])
            if sabon not in self.employees:
                self.employees[sabon] = EmployeeDataStructure()

            emp = self.employees[sabon]
            emp.sabon = sabon

            emp.employee_profile = {
                '사원명': row.get('사원명'),
                '직종': row.get('직종'),
                'Career_Path': row.get('Career Path'),
                '소속': row.get('소속'),
                '소속경로': row.get('소속경로'),
                '위촉구분': row.get('위촉구분'),
                '위촉일': str(row.get('위촉일')) if pd.notna(row.get('위촉일')) else None,
                '영업개시일': str(row.get('영업개시일')) if pd.notna(row.get('영업개시일')) else None,
                '퇴사일자': str(row.get('퇴사일자')) if pd.notna(row.get('퇴사일자')) else None,
                '부지급여부': row.get('부지급여부'),
                '계좌번호': str(row.get('계좌번호')) if pd.notna(row.get('계좌번호')) else None,
                '은행': row.get('은행'),
                '마감월': str(row.get('마감월')),
                '조직': {
                    '회사': row.get('현재 소속경로_회사'),
                    '구분': row.get('현재 소속경로_구분'),
                    '본부': row.get('현재 소속경로_본부'),
                    '사업단': row.get('현재 소속경로_사업단'),
                    'Agency': row.get('현재 소속경로_Agency'),
                    '팀': row.get('현재 소속경로_팀')
                }
            }

            emp.summary_financials = {
                '최종지급액': float(row.get('최종지급액', 0) or 0),
                '커미션계': float(row.get('커미션계', 0) or 0),
                'FC_커미션계': float(row.get('FC 커미션계', 0) or 0),
                'FC계약모집_커미션': float(row.get('FC계약모집 커미션Ⅱ', 0) or 0),
                '현금시책': float(row.get('현금시책', 0) or 0),
                'FC계약유지_커미션': float(row.get('FC계약유지 및 서비스 커미션Ⅱ', 0) or 0),
                '오버라이드계': float(row.get('오버라이드계', 0) or 0),
                'BM_오버라이드': float(row.get('BM 오버라이드Ⅱ', 0) or 0),
                'MD_오버라이드': float(row.get('MD 오버라이드Ⅱ', 0) or 0),
                '사업단장_오버라이드': float(row.get('사업단장 오버라이드Ⅱ', 0) or 0),
                '지사장_오버라이드': float(row.get('지사장 오버라이드Ⅱ', 0) or 0),
                '유치자_오버라이드': float(row.get('유치자 오버라이드Ⅱ', 0) or 0),
                '공통커미션계': float(row.get('공통커미션계', 0) or 0),
                'Account_Balance_당월적립액': float(row.get('Account Balance 당월적립액', 0) or 0),
                'Account_Balance_지급액': float(row.get('Account Balance 지급액', 0) or 0),
                '이월_보수_환수금액': float(row.get('이월 보수 환수금액', 0) or 0),
                '미환수_유보금액': float(row.get('미환수 유보금액', 0) or 0),
                '기타커미션계': float(row.get('기타커미션계', 0) or 0),
                '지사지급': float(row.get('지사지급', 0) or 0),
                '과세계': float(row.get('과세계', 0) or 0),
                '공제계': float(row.get('공제계', 0) or 0),
                '소득세': float(row.get('소득세', 0) or 0),
                '주민세': float(row.get('주민세', 0) or 0),
                '원천세': float(row.get('원천세', 0) or 0),
                '근로산재보험료': float(row.get('근로산재보험료', 0) or 0),
                '고용보험료': float(row.get('고용보험료', 0) or 0)
            }

        print(f"  ✓ Processed {len(self.employees)} employees")

    def process_commission_contracts(self):
        """Process 건별수수료 (Commission by Contract)"""
        print("Processing 건별수수료 (Commission by Contract)...")
        df = self.safe_read_sheet('건별수수료')

        contract_count = 0
        for _, row in df.iterrows():
            sabon = str(row['지급사원번호'])
            if sabon not in self.employees:
                self.employees[sabon] = EmployeeDataStructure()
                self.employees[sabon].sabon = sabon

            emp = self.employees[sabon]

            contract = {
                '마감월': str(row.get('마감월')),
                '보험사': row.get('보험사'),
                '증권번호': str(row.get('증권번호')),
                '계약일': str(row.get('계약일')) if pd.notna(row.get('계약일')) else None,
                '계약상태': row.get('처리계약상태'),
                '납입회차': int(row.get('처리납입회차', 0) or 0),
                '지급로직': row.get('지급로직'),
                '납입방법': row.get('납입방법'),
                '선지급_분급': row.get('선지급/분급'),
                '규정': row.get('규정'),
                '배분율': float(row.get('배분율', 0) or 0),
                '보험료': float(row.get('보험료', 0) or 0),
                'MFYC': float(row.get('MFYC', 0) or 0),
                'AFYC': float(row.get('AFYC', 0) or 0),
                '보험사환산': float(row.get('보험사환산', 0) or 0),
                '지급율': float(row.get('지급율', 0) or 0),
                '지급수수료_모집': float(row.get('[지급수수료] 모집', 0) or 0),
                '지급수수료_유지': float(row.get('[지급수수료] 유지', 0) or 0),
                '지급수수료_자동차': float(row.get('[지급수수료] 자동차', 0) or 0),
                '지급수수료_일반': float(row.get('[지급수수료] 일반', 0) or 0),
                '지급수수료_합계': float(row.get('[지급수수료] 합계', 0) or 0),
                '수입수수료_성과': float(row.get('[수입수수료] 성과', 0) or 0),
                '수입수수료_계약관리': float(row.get('[수입수수료] 계약관리', 0) or 0),
                '수입수수료_수금': float(row.get('[수입수수료] 수금', 0) or 0),
                '수입수수료_자동차': float(row.get('[수입수수료] 자동차', 0) or 0),
                '수입수수료_일반': float(row.get('[수입수수료] 일반', 0) or 0),
                '수입수수료_합계': float(row.get('[수입수수료] 합계', 0) or 0),
                '상품군1': row.get('상품군1'),
                '상품군2': row.get('상품군2'),
                '상품명': row.get('상품명'),
                '계약자': row.get('계약자'),
                '피보험자': row.get('피보험자'),
                '교차판매': row.get('교차판매'),
                '외부이관': row.get('외부이관')
            }

            emp.commission_contracts.append(contract)
            contract_count += 1

        print(f"  ✓ Processed {contract_count} commission contracts")

    def process_override_records(self):
        """Process 건별OR (Override by Contract)"""
        print("Processing 건별OR (Override by Contract)...")
        df = self.safe_read_sheet('건별OR')

        override_count = 0
        for _, row in df.iterrows():
            receiver_sabon = str(row['[오버라이드] 대상자사번'])
            if receiver_sabon not in self.employees:
                self.employees[receiver_sabon] = EmployeeDataStructure()
                self.employees[receiver_sabon].sabon = receiver_sabon

            emp = self.employees[receiver_sabon]

            override = {
                '마감월': str(row.get('마감월')),
                '역할': 'receiver',
                '오버라이드_종류': row.get('[오버라이드] 종류'),
                '오버라이드_대상자': row.get('[오버라이드] 대상자'),
                '오버라이드_규정': row.get('[오버라이드] 규정'),
                'FC_사번': str(row.get('[FC] 대상자사번')),
                'FC_대상자': row.get('[FC] 대상자'),
                'FC_입사차월': int(row.get('[FC] 입사차월', 0) or 0),
                'FC_규정': row.get('[FC] 규정'),
                '보험사': row.get('보험사'),
                '증권번호': str(row.get('증권번호')),
                '계약일': str(row.get('계약일')) if pd.notna(row.get('계약일')) else None,
                '계약상태': row.get('처리계약상태'),
                '납입회차': int(row.get('처리납입회차', 0) or 0),
                '계산방식': row.get('계산방식'),
                '납입방법': row.get('납입방법'),
                '보험료': float(row.get('보험료', 0) or 0),
                'MFYC': float(row.get('MFYC', 0) or 0),
                'AFYC': float(row.get('AFYC', 0) or 0),
                'LP커미션': float(row.get('LP커미션', 0) or 0),
                '지급율': float(row.get('[지급수수료] 지급율', 0) or 0),
                '오버라이드_금액': float(row.get('[지급수수료] 오버라이드', 0) or 0),
                '수입수수료_합계': float(row.get('[수입수수료] 합계', 0) or 0),
                '상품군1': row.get('상품군1'),
                '상품군2': row.get('상품군2'),
                '상품명': row.get('상품명'),
                '계약자': row.get('계약자'),
                '피보험자': row.get('피보험자')
            }

            emp.override_records.append(override)
            override_count += 1

            # Also track in FC's record
            fc_sabon = str(row['[FC] 대상자사번'])
            if fc_sabon not in self.employees:
                self.employees[fc_sabon] = EmployeeDataStructure()
                self.employees[fc_sabon].sabon = fc_sabon

            fc_emp = self.employees[fc_sabon]
            fc_override = override.copy()
            fc_override['역할'] = 'fc'
            fc_override['수령자_사번'] = receiver_sabon
            fc_override['수령자_이름'] = row.get('[오버라이드] 대상자')
            fc_emp.override_records.append(fc_override)

        print(f"  ✓ Processed {override_count} override records")

    def process_policy_contracts(self):
        """Process 시책건별 (Policy by Contract)"""
        print("Processing 시책건별 (Policy by Contract)...")
        df = self.safe_read_sheet('시책건별')

        policy_count = 0
        for _, row in df.iterrows():
            sabon = str(row['사번'])
            if sabon not in self.employees:
                self.employees[sabon] = EmployeeDataStructure()
                self.employees[sabon].sabon = sabon

            emp = self.employees[sabon]

            policy = {
                '마감월': str(row.get('마감월')),
                '소속': row.get('소속'),
                '보험사': row.get('보험사'),
                '증권번호': str(row.get('증권번호')),
                '계약일자': str(row.get('계약일자')) if pd.notna(row.get('계약일자')) else None,
                '납입방법': row.get('납입\n방법'),
                '초회보험료': float(row.get('초회보험료', 0) or 0),
                'CMIP': float(row.get('CMIP', 0) or 0),
                '상품명': row.get('상품명'),
                '계약자': row.get('계약자'),
                '피보험자': row.get('피보험자'),
                '납입기간': row.get('납입기간'),
                '지급시책_법인': float(row.get('지급시책\n_법인', 0) or 0),
                '지급시책_사용인': float(row.get('지급시책\n_사용인', 0) or 0),
                '지급_계': float(row.get('지급 계', 0) or 0),
                '비고': row.get('비고')
            }

            emp.policy_contracts.append(policy)
            policy_count += 1

        print(f"  ✓ Processed {policy_count} policy contracts")

    def process_performance_records(self):
        """Process 업적 (Performance)"""
        print("Processing 업적 (Performance)...")
        try:
            df = self.safe_read_sheet('업적', header=2)

            performance_count = 0
            for _, row in df.iterrows():
                sabon_fields = ['수금LP사번', '모집LP사번', '원모집FC사번']

                for field in sabon_fields:
                    if field in row and pd.notna(row[field]):
                        sabon = str(row[field])
                        if sabon not in self.employees:
                            self.employees[sabon] = EmployeeDataStructure()
                            self.employees[sabon].sabon = sabon

                        emp = self.employees[sabon]

                        perf = {
                            '역할': field.replace('사번', ''),
                            '원모집LP': row.get('원모집LP'),
                            '수금LP': row.get('수금LP'),
                            '수금자소속': {
                                '소속1': row.get('수금자소속1'),
                                '소속2': row.get('수금자소속2'),
                                '소속3': row.get('수금자소속3'),
                                '소속4': row.get('수금자소속4'),
                                '소속5': row.get('수금자소속5'),
                                '소속6': row.get('수금자소속6')
                            },
                            '모집LP': row.get('모집LP'),
                            '보험사': row.get('보험사'),
                            '생손보구분': row.get('생손보구분'),
                            '상품군1': row.get('상품군1'),
                            '상품군2': row.get('상품군2'),
                            '증권번호': str(row.get('증권번호')) if pd.notna(row.get('증권번호')) else None,
                            '계약일자': str(row.get('계약일자')) if pd.notna(row.get('계약일자')) else None,
                            '계약상태': row.get('계약상태'),
                            '계약상세상태': row.get('계약상세상태'),
                            '상태변경일': str(row.get('상태변경일')) if pd.notna(row.get('상태변경일')) else None
                        }

                        emp.performance_records.append(perf)
                        performance_count += 1

            print(f"  ✓ Processed {performance_count} performance records")
        except Exception as e:
            print(f"  ⚠ Error processing performance records: {e}")

    def process_additional_allowances(self):
        """Process additional allowance sheets"""
        print("Processing additional allowances...")

        # 시책2 인별명세
        try:
            df = self.safe_read_sheet('시책2 인별명세', header=4)
            for _, row in df.iterrows():
                if 'FC 사번' in df.columns and pd.notna(row.get('FC 사번')):
                    sabon = str(row['FC 사번'])
                    if sabon not in self.employees:
                        self.employees[sabon] = EmployeeDataStructure()
                        self.employees[sabon].sabon = sabon

                    emp = self.employees[sabon]
                    emp.additional_allowances['시책2_지사시책'] = {
                        '금액': float(row.get('지급액', 0) or 0),
                        '비고': row.get('비고')
                    }
            print("  ✓ Processed 시책2 인별명세")
        except Exception as e:
            print(f"  ⚠ Error processing 시책2 인별명세: {e}")

        # 손보EXT
        try:
            df = self.safe_read_sheet('손보EXT', header=4)
            for _, row in df.iterrows():
                if 'FC 사번' in df.columns and pd.notna(row.get('FC 사번')):
                    sabon = str(row['FC 사번'])
                    if sabon not in self.employees:
                        self.employees[sabon] = EmployeeDataStructure()
                        self.employees[sabon].sabon = sabon

                    emp = self.employees[sabon]
                    emp.additional_allowances['손보EXT'] = {
                        '금액': float(row.get('손보시책 Ext', 0) or 0),
                        '비고': row.get('비고')
                    }
            print("  ✓ Processed 손보EXT")
        except Exception as e:
            print(f"  ⚠ Error processing 손보EXT: {e}")

        # 수당_신입IP
        try:
            df = self.safe_read_sheet('수당_신입IP(2025위촉)', header=5)
            for _, row in df.iterrows():
                if 'FC 사번' in df.columns and pd.notna(row.get('FC 사번')):
                    sabon = str(row['FC 사번'])
                    if sabon not in self.employees:
                        self.employees[sabon] = EmployeeDataStructure()
                        self.employees[sabon].sabon = sabon

                    emp = self.employees[sabon]
                    emp.additional_allowances['신입IP수당'] = {
                        '금액': float(row.get('지급액', 0) or 0),
                        '모집업적': float(row.get('모집(환산)업적', 0) or 0),
                        '지급대상액': float(row.get('지급대상액', 0) or 0)
                    }
            print("  ✓ Processed 수당_신입IP")
        except Exception as e:
            print(f"  ⚠ Error processing 수당_신입IP: {e}")

        # MGR상생(BM)
        try:
            df = self.safe_read_sheet('MGR상생(BM)', header=4)
            for _, row in df.iterrows():
                if '사번' in df.columns and pd.notna(row.get('사번')):
                    sabon = str(row['사번'])
                    if sabon not in self.employees:
                        self.employees[sabon] = EmployeeDataStructure()
                        self.employees[sabon].sabon = sabon

                    emp = self.employees[sabon]
                    emp.additional_allowances['MGR상생'] = {
                        '금액': float(row.get('활성화 지원금', 0) or 0),
                        '총_모집업적': float(row.get('총 모집업적\n(생,손보)', 0) or 0),
                        '손보모집업적': float(row.get('손보모집업적(①)', 0) or 0),
                        '지급율': float(row.get('지급율(%)', 0) or 0)
                    }
            print("  ✓ Processed MGR상생(BM)")
        except Exception as e:
            print(f"  ⚠ Error processing MGR상생(BM): {e}")

        # 13회차 유지(4%)
        try:
            df = self.safe_read_sheet('13회차 유지(4%)', header=4)
            for _, row in df.iterrows():
                if 'FC 사번' in df.columns and pd.notna(row.get('FC 사번')):
                    sabon = str(row['FC 사번'])
                    if sabon not in self.employees:
                        self.employees[sabon] = EmployeeDataStructure()
                        self.employees[sabon].sabon = sabon

                    retention = {
                        '보험사': row.get('보험사'),
                        '증권번호': str(row.get('증번')) if pd.notna(row.get('증번')) else None,
                        '계약일': str(row.get('계약일')) if pd.notna(row.get('계약일')) else None,
                        '회차': int(row.get('회차', 0) or 0),
                        '상품명': row.get('상품명'),
                        '추가지급율': float(row.get('추가지급율', 0) or 0),
                        '지급액': float(row.get('지급액', 0) or 0),
                        '비고': row.get('비고')
                    }

                    emp = self.employees[sabon]
                    if '13회차유지' not in emp.additional_allowances:
                        emp.additional_allowances['13회차유지'] = []
                    emp.additional_allowances['13회차유지'].append(retention)

            print("  ✓ Processed 13회차 유지(4%)")
        except Exception as e:
            print(f"  ⚠ Error processing 13회차 유지(4%): {e}")

    def process_clawback_records(self):
        """Process clawback (환수) sheets"""
        print("Processing clawback records...")

        # 환수_시책2지급분_완료
        try:
            df = self.safe_read_sheet('환수_시책2지급분_완료', header=5)
            for _, row in df.iterrows():
                if '사번' in df.columns and pd.notna(row.get('사번')):
                    sabon = str(row['사번'])
                    if sabon not in self.employees:
                        self.employees[sabon] = EmployeeDataStructure()
                        self.employees[sabon].sabon = sabon

                    emp = self.employees[sabon]

                    clawback = {
                        '환수유형': '시책2지급분',
                        '보험사': row.get('보험사'),
                        '증권번호': str(row.get('증번')) if pd.notna(row.get('증번')) else None,
                        '계약일': str(row.get('계약일')) if pd.notna(row.get('계약일')) else None,
                        '상품명': row.get('상품명'),
                        '계약상태': row.get('계약상태'),
                        '초기_월납P': float(row.get('초기_월납P', 0) or 0),
                        '변경_월납P': float(row.get('변경_월납P', 0) or 0),
                        '환수금액': float(row.get('지급액', 0) or 0)
                    }

                    emp.clawback_records.append(clawback)
            print("  ✓ Processed 환수_시책2지급분_완료")
        except Exception as e:
            print(f"  ⚠ Error processing 환수_시책2지급분_완료: {e}")

        # 환수_소개비_완료
        try:
            df = self.safe_read_sheet('환수_소개비_완료', header=5)
            for _, row in df.iterrows():
                if '사번' in df.columns and pd.notna(row.get('사번')):
                    sabon = str(row['사번'])
                    if sabon not in self.employees:
                        self.employees[sabon] = EmployeeDataStructure()
                        self.employees[sabon].sabon = sabon

                    emp = self.employees[sabon]

                    clawback = {
                        '환수유형': '소개비',
                        '도입자사번': str(row.get('도입자사번')) if pd.notna(row.get('도입자사번')) else None,
                        '도입인원': int(row.get('도입인원', 0) or 0),
                        '위촉일': str(row.get('위촉일')) if pd.notna(row.get('위촉일')) else None,
                        '해촉일': str(row.get('해촉일')) if pd.notna(row.get('해촉일')) else None,
                        '환수금액': float(row.get('환수대상액', 0) or 0),
                    }

                    emp.clawback_records.append(clawback)
            print("  ✓ Processed 환수_소개비_완료")
        except Exception as e:
            print(f"  ⚠ Error processing 환수_소개비_완료: {e}")

        # 환수_교육비_완료
        try:
            df = self.safe_read_sheet('환수_교육비_완료', header=18)
            for _, row in df.iterrows():
                if '사번' in df.columns and pd.notna(row.get('사번')):
                    sabon = str(row['사번'])
                    if sabon not in self.employees:
                        self.employees[sabon] = EmployeeDataStructure()
                        self.employees[sabon].sabon = sabon

                    emp = self.employees[sabon]

                    clawback = {
                        '환수유형': '교육비',
                        '위촉일': str(row.get('위촉일')) if pd.notna(row.get('위촉일')) else None,
                        '해촉일': str(row.get('해촉일')) if pd.notna(row.get('해촉일')) else None,
                        '환수금액': float(row.get('환수대상액', 0) or 0),
                        '기준월': str(row.get('기준월')) if pd.notna(row.get('기준월')) else None,
                    }

                    emp.clawback_records.append(clawback)
            print("  ✓ Processed 환수_교육비_완료")
        except Exception as e:
            print(f"  ⚠ Error processing 환수_교육비_완료: {e}")

    def calculate_aggregated_financials(self):
        """Calculate aggregated financial summaries for each employee"""
        print("Calculating aggregated financials...")

        for sabon, emp in self.employees.items():
            총_커미션 = sum(c.get('지급수수료_합계', 0) for c in emp.commission_contracts)
            총_오버라이드 = sum(
                o.get('오버라이드_금액', 0)
                for o in emp.override_records
                if o.get('역할') == 'receiver'
            )
            총_시책금액 = sum(p.get('지급_계', 0) for p in emp.policy_contracts)
            총_환수금액 = sum(c.get('환수금액', 0) for c in emp.clawback_records)

            emp.summary_financials['총_커미션'] = 총_커미션
            emp.summary_financials['총_오버라이드'] = 총_오버라이드
            emp.summary_financials['총_시책금액'] = 총_시책금액
            emp.summary_financials['총_환수금액'] = 총_환수금액
            emp.summary_financials['계약건수'] = len(emp.commission_contracts)
            emp.summary_financials['오버라이드건수'] = len([o for o in emp.override_records if o.get('역할') == 'receiver'])
            emp.summary_financials['시책계약건수'] = len(emp.policy_contracts)
            emp.summary_financials['환수건수'] = len(emp.clawback_records)

        print(f"  ✓ Calculated financials for {len(self.employees)} employees")

    def process_all(self):
        """Process all sheets in order"""
        print("\n" + "="*80)
        print("STEP 1: PROCESSING EXCEL DATA")
        print("="*80 + "\n")

        self.process_individual_statements()
        self.process_commission_contracts()
        self.process_override_records()
        self.process_policy_contracts()
        self.process_performance_records()
        self.process_additional_allowances()
        self.process_clawback_records()
        self.calculate_aggregated_financials()

        print("\n" + "="*80)
        print(f"EXCEL PROCESSING COMPLETE: {len(self.employees)} employees")
        print("="*80 + "\n")

        return self.employees

    def generate_employee_centric_documents(self) -> List[Dict[str, Any]]:
        """Generate employee-centric documents for Pinecone upload"""
        documents = []

        for sabon, emp in self.employees.items():
            # Create main profile document
            doc = {
                'id': f"{sabon}_profile",
                'doc_type': 'employee_profile',
                'text': emp.to_text_for_embedding(),
                'metadata': {
                    '사번': sabon,
                    '사원명': emp.employee_profile.get('사원명', ''),
                    '직종': emp.employee_profile.get('직종', ''),
                    '소속': emp.employee_profile.get('소속', ''),
                    '위촉일': emp.employee_profile.get('위촉일', ''),
                    '최종지급액': emp.summary_financials.get('최종지급액', 0),
                    '총_커미션': emp.summary_financials.get('총_커미션', 0),
                    '총_오버라이드': emp.summary_financials.get('총_오버라이드', 0),
                    '계약건수': emp.summary_financials.get('계약건수', 0),
                }
            }
            documents.append(doc)

        return documents

    def print_summary(self):
        """Print summary statistics"""
        print("\n" + "="*80)
        print("DATA SUMMARY")
        print("="*80)

        print(f"\nTotal Employees: {len(self.employees)}")

        total_commission = sum(len(emp.commission_contracts) for emp in self.employees.values())
        total_override = sum(len(emp.override_records) for emp in self.employees.values())
        total_policy = sum(len(emp.policy_contracts) for emp in self.employees.values())
        total_performance = sum(len(emp.performance_records) for emp in self.employees.values())
        total_clawback = sum(len(emp.clawback_records) for emp in self.employees.values())

        print(f"\nTotal Records:")
        print(f"  - Commission Contracts: {total_commission:,}")
        print(f"  - Override Records: {total_override:,}")
        print(f"  - Policy Contracts: {total_policy:,}")
        print(f"  - Performance Records: {total_performance:,}")
        print(f"  - Clawback Records: {total_clawback:,}")

        total_final_payment = sum(
            emp.summary_financials.get('최종지급액', 0)
            for emp in self.employees.values()
        )
        total_commission_sum = sum(
            emp.summary_financials.get('총_커미션', 0)
            for emp in self.employees.values()
        )
        total_override_sum = sum(
            emp.summary_financials.get('총_오버라이드', 0)
            for emp in self.employees.values()
        )

        print(f"\nFinancial Summary:")
        print(f"  - Total Final Payments: {total_final_payment:,.0f} 원")
        print(f"  - Total Commissions: {total_commission_sum:,.0f} 원")
        print(f"  - Total Overrides: {total_override_sum:,.0f} 원")


# =============================================================================
# PART 3: PINECONE UPLOADER
# =============================================================================

class SecurePineconeUploader:
    """Secure uploader with namespace isolation"""

    def __init__(
        self,
        index_name: str = "employee-compensation",
        embedding_model: str = "text-embedding-3-large",
        dimension: int = 3072
    ):
        self.validate_environment()

        self.pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
        self.openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

        self.index_name = index_name
        self.embedding_model = embedding_model
        self.dimension = dimension

        self.setup_index()
        self.index = self.pc.Index(self.index_name)

    def validate_environment(self):
        """Validate required environment variables"""
        required = ["PINECONE_API_KEY", "OPENAI_API_KEY"]
        missing = [var for var in required if not os.environ.get(var)]

        if missing:
            print("❌ Missing required environment variables:")
            for var in missing:
                print(f"   - {var}")
            print("\nSet them using:")
            print("   export PINECONE_API_KEY='your-key'")
            print("   export OPENAI_API_KEY='your-key'")
            sys.exit(1)

    def setup_index(self):
        """Verify index exists and get its specs"""
        try:
            indexes = list(self.pc.list_indexes())
            existing_index = next((idx for idx in indexes if idx.name == self.index_name), None)

            if existing_index:
                print(f"✅ Using existing index: {self.index_name}")
                print(f"   Dimension: {existing_index.dimension}")
                print(f"   Metric: {existing_index.metric}")

                if existing_index.dimension != self.dimension:
                    print(f"\n⚠️  Warning: Index dimension ({existing_index.dimension}) differs from embedding model ({self.dimension})")
                    print(f"   Updating to use index dimension: {existing_index.dimension}")
                    self.dimension = existing_index.dimension

                    if self.dimension == 1536:
                        print(f"   Switching to text-embedding-3-small (1536 dimensions)")
                        self.embedding_model = "text-embedding-3-small"
            else:
                print(f"❌ Index '{self.index_name}' not found")
                print(f"\nAvailable indexes:")
                for idx in indexes:
                    print(f"   - {idx.name} (dimension: {idx.dimension})")
                raise ValueError(f"Index '{self.index_name}' does not exist")

        except Exception as e:
            print(f"❌ Error checking index: {e}")
            raise

    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings in batch"""
        if len(texts) > 2048:
            raise ValueError("OpenAI supports max 2048 texts per batch")

        response = self.openai_client.embeddings.create(
            model=self.embedding_model,
            input=texts,
            encoding_format="float"
        )

        return [item.embedding for item in response.data]

    def upload_documents(
        self,
        documents: List[Dict[Any, Any]],
        batch_size: int = 100
    ):
        """Securely upload documents with namespace isolation"""
        print("\n" + "="*80)
        print("STEP 2: SECURE PINECONE UPLOAD")
        print("="*80)

        # Group documents by employee
        docs_by_employee = {}
        for doc in documents:
            sabon = doc['metadata']['사번']
            if sabon not in docs_by_employee:
                docs_by_employee[sabon] = []
            docs_by_employee[sabon].append(doc)

        print(f"\n📊 Upload Statistics:")
        print(f"   Total employees: {len(docs_by_employee)}")
        print(f"   Total documents: {len(documents)}")
        print(f"   Avg docs per employee: {len(documents) / len(docs_by_employee):.1f}")
        print(f"   Batch size: {batch_size}")
        print(f"   Embedding model: {self.embedding_model}")
        print(f"   Embedding dimension: {self.dimension}")
        print(f"\n🔐 Security: Namespace isolation per employee")

        total_uploaded = 0
        total_cost = 0.0

        for idx, (sabon, employee_docs) in enumerate(tqdm(docs_by_employee.items(), desc="Uploading employees"), 1):
            namespace = f"employee_{sabon}"
            사원명 = employee_docs[0]['metadata'].get('사원명', 'Unknown')

            # Process in batches
            for batch_idx in range(0, len(employee_docs), batch_size):
                batch = employee_docs[batch_idx:batch_idx + batch_size]

                texts = [doc['text'] for doc in batch]

                total_chars = sum(len(text) for text in texts)
                estimated_tokens = total_chars / 4
                estimated_cost = (estimated_tokens / 1000) * 0.00013

                try:
                    embeddings = self.generate_embeddings_batch(texts)
                    total_cost += estimated_cost
                except Exception as e:
                    print(f"\n❌ Error generating embeddings for {사원명}: {e}")
                    continue

                vectors = []
                for doc, embedding in zip(batch, embeddings):
                    doc_sabon = doc['metadata']['사번']
                    if doc_sabon != sabon:
                        raise ValueError(
                            f"🚨 Security Error: Document 사번 ({doc_sabon}) "
                            f"doesn't match employee ({sabon})"
                        )

                    vector = {
                        'id': doc['id'],
                        'values': embedding,
                        'metadata': {
                            '사번': doc['metadata']['사번'],
                            '사원명': doc['metadata']['사원명'],
                            'doc_type': doc['doc_type'],
                            **{k: v for k, v in doc['metadata'].items()
                               if k not in ['사번', '사원명', 'doc_type'] and v is not None}
                        }
                    }
                    vectors.append(vector)

                try:
                    self.index.upsert(
                        vectors=vectors,
                        namespace=namespace
                    )
                    total_uploaded += len(vectors)
                except Exception as e:
                    print(f"\n❌ Error uploading for {사원명}: {e}")

        print("\n" + "="*80)
        print("📊 UPLOAD COMPLETE")
        print("="*80)
        print(f"\n✅ Successfully uploaded: {total_uploaded} vectors")
        print(f"💰 Estimated embedding cost: ${total_cost:.4f}")

        self.verify_upload()

    def verify_upload(self):
        """Verify upload with index statistics"""
        print("\n🔍 VERIFICATION")

        try:
            stats = self.index.describe_index_stats()

            print(f"\n📊 Index Statistics:")
            print(f"   Total vectors: {stats['total_vector_count']:,}")
            print(f"   Dimension: {stats['dimension']}")
            print(f"   Namespaces: {len(stats['namespaces'])}")

            print(f"\n✅ Verification complete")

        except Exception as e:
            print(f"\n⚠️  Could not verify upload: {e}")


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Main execution - combines Excel parsing and Pinecone upload"""
    import argparse
    parser = argparse.ArgumentParser(description='Combined Excel to Pinecone Pipeline')
    parser.add_argument('-y', '--yes', action='store_true', help='Skip confirmation prompt')
    args = parser.parse_args()

    print("="*80)
    print("COMBINED EXCEL TO PINECONE PIPELINE")
    print("="*80)

    # Configuration
    EXCEL_PATH = '/Users/kjyoo/JISA_V3/★202509마감_HO&F 건별 및 명세_20251023_배포용_수도권, AL.xlsx'
    INDEX_NAME = "hof-branch-chatbot"
    EMBEDDING_MODEL = "text-embedding-3-large"
    DIMENSION = 3072
    BATCH_SIZE = 100
    SKIP_CONFIRM = args.yes

    # Check if Excel file exists
    if not Path(EXCEL_PATH).exists():
        print(f"❌ Excel file not found: {EXCEL_PATH}")
        sys.exit(1)

    print(f"\n📁 Excel file: {EXCEL_PATH}")
    print(f"🎯 Target index: {INDEX_NAME}")
    print(f"🔢 Embedding model: {EMBEDDING_MODEL}")

    # Step 1: Process Excel
    print("\n" + "="*80)
    processor = ExcelDataProcessor(EXCEL_PATH)
    employees = processor.process_all()
    processor.print_summary()

    # Generate documents for upload
    print("\n📄 Generating employee-centric documents...")
    documents = processor.generate_employee_centric_documents()
    print(f"   Generated {len(documents)} documents")

    # Step 2: Upload to Pinecone
    print("\n" + "="*80)
    print(f"\n⚠️  You are about to upload {len(documents)} documents to Pinecone")
    print(f"   Index: {INDEX_NAME}")
    print(f"   Embedding model: {EMBEDDING_MODEL}")
    print(f"   Estimated cost: ${(len(documents) * 500 / 4 / 1000 * 0.00013):.4f}")

    if not SKIP_CONFIRM:
        response = input("\n   Proceed with upload? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("\n❌ Upload cancelled")
            sys.exit(0)
    else:
        print("\n   Auto-confirmed with --yes flag")

    # Initialize uploader and upload
    uploader = SecurePineconeUploader(
        index_name=INDEX_NAME,
        embedding_model=EMBEDDING_MODEL,
        dimension=DIMENSION
    )

    uploader.upload_documents(
        documents=documents,
        batch_size=BATCH_SIZE
    )

    print("\n" + "="*80)
    print("✅ ALL COMPLETE")
    print("="*80)
    print(f"\n🎉 Pipeline completed successfully!")
    print(f"\n📊 Summary:")
    print(f"   - Employees processed: {len(employees)}")
    print(f"   - Documents uploaded: {len(documents)}")
    print(f"   - Target index: {INDEX_NAME}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
