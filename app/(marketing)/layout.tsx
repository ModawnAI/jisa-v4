import type { Metadata } from 'next';
import { MarketingNav } from '@/components/landing/marketing-nav';
import { MarketingFooter } from '@/components/landing/marketing-footer';

export const metadata: Metadata = {
  title: 'ContractorHub - AI 기반 보험 계약자 보상 관리 플랫폼',
  description:
    '복잡한 수수료 계산과 문서 관리를 카카오톡 한 번으로 해결하세요. Excel 업로드부터 직원별 정산까지, AI가 자동으로 처리합니다.',
  keywords: [
    '보상관리',
    '수수료계산',
    '보험',
    'AI',
    '카카오톡',
    '챗봇',
    'Excel',
    '자동화',
    'RAG',
    'MDRT',
  ],
  openGraph: {
    title: 'ContractorHub - AI 보상 관리 플랫폼',
    description: '보험 계약자 보상 관리, 이제 AI가 자동으로',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ContractorHub - AI 보상 관리 플랫폼',
    description: '보험 계약자 보상 관리, 이제 AI가 자동으로',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
