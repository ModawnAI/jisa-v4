import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/lib/auth/provider';
import './globals.css';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: '모드온 AI - 카카오톡 기반 AI 사내정보 챗봇',
    template: '%s | 모드온 AI',
  },
  description:
    '새 앱 설치 없이 카카오톡으로 정산, 영업정책, 사내규정 조회. 문서 업로드하고 인증코드 공유하면 끝. 직급별 권한 설정으로 개인 맞춤 답변.',
  keywords: [
    '카카오톡',
    'AI챗봇',
    '사내정보',
    '정산조회',
    '영업정책',
    'RAG',
    '모드온',
    'Modawn',
    'E2EE',
    '종단간암호화',
    '권한관리',
  ],
  metadataBase: new URL('https://modawn.ai'),
  openGraph: {
    title: '모드온 AI - 카카오톡 기반 AI 사내정보 챗봇',
    description:
      '새 앱 설치 없이 카카오톡으로 사내정보 조회. 3분 세팅, E2EE 보안, 직급별 권한.',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://modawn.ai',
    siteName: '모드온 AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: '모드온 AI - 카카오톡 기반 AI 사내정보 챗봇',
    description: '새 앱 설치 없이 카카오톡으로 사내정보 조회. 3분 세팅, E2EE 보안.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${notoSansKR.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
