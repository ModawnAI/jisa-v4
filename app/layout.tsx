import type { Metadata, Viewport } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import Script from 'next/script';
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

// ============================================
// SEO, AEO, GEO Extensively Optimized Metadata
// ============================================
export const metadata: Metadata = {
  // ========== BASIC METADATA ==========
  title: {
    default: '모드온 AI - 카카오톡 기반 AI 사내정보 챗봇 | 3분 세팅, 월 4,900원',
    template: '%s | 모드온 AI - 카카오톡 AI 사내정보 챗봇',
  },
  description:
    '새 앱 설치 없이 카카오톡으로 급여, 정산, 영업정책, 사내규정 즉시 조회. 문서 업로드 한 번이면 AI 챗봇 세팅 완료. E2EE 종단간 암호화로 민감정보 100% 보호. 직급별 권한 설정으로 개인 맞춤 답변. 월 4,900원/1인, 30일 무료 체험. 중소기업부터 대기업까지 500+ 기업이 선택한 HR AI 솔루션.',

  // ========== EXTENSIVE KEYWORDS FOR SEO ==========
  keywords: [
    // === Primary Keywords (Korean) ===
    '카카오톡 AI 챗봇',
    'AI 사내정보 챗봇',
    '기업용 AI 챗봇',
    '사내 문의 자동화',
    '직원 셀프서비스',
    '사내 AI 비서',
    '업무 자동화 AI',

    // === Feature Keywords ===
    '급여 조회 챗봇',
    '정산 내역 조회',
    '영업정책 AI',
    '사내규정 검색',
    '복리후생 안내',
    '휴가 조회 시스템',
    '인사정보 조회',
    '문서 검색 AI',
    '사내 FAQ 챗봇',

    // === Industry Keywords ===
    'HR 챗봇',
    'HR 자동화',
    'HRM AI',
    '인사관리 AI',
    '인사 업무 자동화',
    '인사팀 업무 효율화',
    'HR Tech',
    '기업용 챗봇',
    'B2B AI',
    'SaaS 챗봇',

    // === Technical Keywords ===
    'RAG 기술',
    'E2EE 암호화',
    '종단간 암호화',
    '문서 AI 분석',
    'LLM 챗봇',
    'AI 지식베이스',
    '벡터 검색',
    '시맨틱 검색',
    'Retrieval Augmented Generation',

    // === Brand Keywords ===
    '모드온',
    '모드온 AI',
    'Modawn',
    'Modawn AI',
    '모던 AI',
    'modon ai',

    // === Competitor/Alternative Keywords ===
    '슬랙 대안',
    '노션 AI 대안',
    '챗GPT 기업용',
    'ChatGPT 사내',
    '워크플로우 자동화',
    'Notion AI 대체',
    'MS Teams 챗봇',
    '카카오워크 대안',

    // === Long-tail Keywords ===
    '카카오톡으로 회사 정보 조회',
    '앱 설치 없이 사내정보',
    '3분 만에 AI 챗봇 구축',
    '문서 업로드만으로 챗봇 생성',
    '중소기업 AI 챗봇',
    '스타트업 HR 자동화',
    '저렴한 기업용 AI',
    '간편한 사내정보 시스템',

    // === Use Case Keywords ===
    '신입사원 온보딩',
    '직원 질문 응대 자동화',
    '반복 문의 처리',
    '사내 지식 관리',
    '업무 매뉴얼 검색',
    '정책 문서 AI 검색',

    // === Location Keywords (GEO) ===
    '한국 AI 솔루션',
    '국내 HR 챗봇',
    '서울 AI 스타트업',
    '대한민국 기업용 AI',
  ],

  // ========== AUTHORS AND CREATOR ==========
  authors: [
    { name: '모드온 AI', url: 'https://modawn.ai' },
    { name: 'Modawn AI Team' },
  ],
  creator: '모드온 AI',
  publisher: '모드온 AI',

  // ========== METADATA BASE ==========
  metadataBase: new URL('https://modawn.ai'),

  // ========== ALTERNATE LANGUAGES (GEO) ==========
  alternates: {
    canonical: 'https://modawn.ai',
    languages: {
      'ko-KR': 'https://modawn.ai',
      'ko': 'https://modawn.ai',
      'x-default': 'https://modawn.ai',
    },
  },

  // ========== OPEN GRAPH (SOCIAL SHARING) ==========
  openGraph: {
    title: '모드온 AI - 카카오톡 기반 AI 사내정보 챗봇',
    description:
      '새 앱 설치 없이 카카오톡으로 급여, 정산, 사내규정 즉시 조회. 3분 세팅, E2EE 보안, 직급별 권한 설정. 월 4,900원/1인. 30일 무료 체험.',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://modawn.ai',
    siteName: '모드온 AI',
    countryName: 'South Korea',
    emails: ['contact@modawn.ai'],
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: '모드온 AI - 카카오톡 기반 AI 사내정보 챗봇. 3분 세팅, E2EE 보안, 월 4,900원',
        type: 'image/png',
      },
      {
        url: '/og-image-square.png',
        width: 1200,
        height: 1200,
        alt: '모드온 AI 로고',
        type: 'image/png',
      },
    ],
  },

  // ========== TWITTER CARD ==========
  twitter: {
    card: 'summary_large_image',
    title: '모드온 AI - 카카오톡 AI 사내정보 챗봇 | 3분 세팅',
    description:
      '새 앱 설치 없이 카카오톡으로 사내정보 즉시 조회. 급여, 정산, 사내규정 AI 검색. E2EE 보안, 월 4,900원. 30일 무료 체험.',
    images: ['/twitter-image'],
    creator: '@modawn_ai',
    site: '@modawn_ai',
  },

  // ========== ROBOTS ==========
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // ========== VERIFICATION ==========
  verification: {
    google: 'google-site-verification-code',
    // yandex: 'yandex-verification-code',
    // yahoo: 'yahoo-verification-code',
    // other: {
    //   'naver-site-verification': 'naver-verification-code',
    //   'facebook-domain-verification': 'facebook-verification-code',
    // },
  },

  // ========== APP LINKS ==========
  appleWebApp: {
    capable: true,
    title: '모드온 AI',
    statusBarStyle: 'black-translucent',
    startupImage: [
      '/apple-touch-startup-image.png',
    ],
  },

  // ========== FORMAT DETECTION ==========
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  // ========== ICONS ==========
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#1e9df1' },
    ],
  },

  // ========== MANIFEST ==========
  manifest: '/site.webmanifest',

  // ========== CATEGORY & CLASSIFICATION ==========
  category: 'business',
  classification: 'Business/Enterprise Software/HR Technology/AI Chatbot',

  // ========== OTHER ==========
  applicationName: '모드온 AI',
  referrer: 'origin-when-cross-origin',
  generator: 'Next.js',

  // ========== ADDITIONAL METADATA ==========
  other: {
    // AEO (Answer Engine Optimization)
    'ai-content-declaration': 'This website provides AI-powered HR chatbot services',

    // GEO Targeting
    'geo.region': 'KR',
    'geo.placename': 'Seoul, South Korea',
    'geo.position': '37.5665;126.9780',
    'ICBM': '37.5665, 126.9780',

    // Dublin Core
    'DC.title': '모드온 AI - 카카오톡 기반 AI 사내정보 챗봇',
    'DC.creator': '모드온 AI',
    'DC.subject': 'AI 챗봇, HR 자동화, 사내정보 시스템',
    'DC.description': '카카오톡 기반 AI 사내정보 챗봇 서비스',
    'DC.publisher': '모드온 AI',
    'DC.language': 'ko',
    'DC.coverage': 'South Korea',

    // Open Search
    'msapplication-TileColor': '#1e9df1',
    'msapplication-config': '/browserconfig.xml',

    // Pinterest
    'p:domain_verify': 'pinterest-verification-code',

    // Mobile App
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': '모드온 AI',

    // Pricing (for search engines)
    'product:price:amount': '4900',
    'product:price:currency': 'KRW',

    // Contact
    'contact:email': 'contact@modawn.ai',
  },
};

// ============================================
// JSON-LD Structured Data for AEO/SEO
// ============================================
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    // Organization
    {
      '@type': 'Organization',
      '@id': 'https://modawn.ai/#organization',
      name: '모드온 AI',
      alternateName: ['Modawn AI', '모드온', 'Modawn'],
      url: 'https://modawn.ai',
      logo: {
        '@type': 'ImageObject',
        url: 'https://modawn.ai/logo.png',
        width: 512,
        height: 512,
      },
      image: 'https://modawn.ai/opengraph-image',
      description: '카카오톡 기반 AI 사내정보 챗봇 서비스. 급여, 정산, 사내규정 즉시 조회.',
      email: 'contact@modawn.ai',
      areaServed: {
        '@type': 'Country',
        name: 'South Korea',
      },
      sameAs: [
        'https://twitter.com/modawn_ai',
        'https://www.linkedin.com/company/modawn-ai',
      ],
    },
    // WebSite
    {
      '@type': 'WebSite',
      '@id': 'https://modawn.ai/#website',
      url: 'https://modawn.ai',
      name: '모드온 AI',
      description: '카카오톡 기반 AI 사내정보 챗봇',
      publisher: {
        '@id': 'https://modawn.ai/#organization',
      },
      inLanguage: 'ko-KR',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://modawn.ai/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
    // SoftwareApplication (Product)
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://modawn.ai/#software',
      name: '모드온 AI',
      alternateName: 'Modawn AI',
      description: '카카오톡 기반 AI 사내정보 챗봇. 새 앱 설치 없이 카카오톡으로 급여, 정산, 사내규정 즉시 조회. 3분 세팅, E2EE 종단간 암호화로 민감정보 보호.',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'HR Software',
      operatingSystem: 'Web, KakaoTalk',
      offers: {
        '@type': 'Offer',
        price: '4900',
        priceCurrency: 'KRW',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '4900',
          priceCurrency: 'KRW',
          unitText: '월/1인',
          billingDuration: 'P1M',
        },
        availability: 'https://schema.org/InStock',
        seller: {
          '@id': 'https://modawn.ai/#organization',
        },
      },
      featureList: [
        '카카오톡 기반 챗봇',
        '3분 만에 세팅 완료',
        'E2EE 종단간 암호화',
        '직급별 권한 설정',
        '급여/정산 조회',
        '사내규정 검색',
        '영업정책 AI 검색',
        'RAG 기반 지능형 검색',
        '30일 무료 체험',
      ],
      screenshot: 'https://modawn.ai/opengraph-image',
      softwareVersion: '2.0',
      releaseNotes: 'https://modawn.ai/changelog',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '127',
        bestRating: '5',
        worstRating: '1',
      },
    },
    // FAQPage for AEO
    {
      '@type': 'FAQPage',
      '@id': 'https://modawn.ai/#faq',
      mainEntity: [
        {
          '@type': 'Question',
          name: '모드온 AI는 무엇인가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '모드온 AI는 카카오톡 기반 AI 사내정보 챗봇입니다. 새 앱 설치 없이 카카오톡으로 급여, 정산, 영업정책, 사내규정을 즉시 조회할 수 있습니다. 문서 업로드 한 번이면 AI 챗봇 세팅이 완료됩니다.',
          },
        },
        {
          '@type': 'Question',
          name: '모드온 AI 가격은 얼마인가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '모드온 AI는 월 4,900원/1인으로 이용 가능합니다. 30일 무료 체험을 제공하며, 결제 정보 없이 바로 시작할 수 있습니다.',
          },
        },
        {
          '@type': 'Question',
          name: '설치나 개발이 필요한가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '아니요, 별도 설치나 개발이 필요 없습니다. 회사 문서를 업로드하면 3분 만에 AI 챗봇 세팅이 완료됩니다. 직원들은 카카오톡으로 바로 사용할 수 있습니다.',
          },
        },
        {
          '@type': 'Question',
          name: '보안은 안전한가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '네, 모드온 AI는 E2EE(종단간 암호화) 기술을 적용하여 민감한 사내정보를 100% 보호합니다. 직급별 권한 설정으로 개인 맞춤 답변만 제공됩니다.',
          },
        },
        {
          '@type': 'Question',
          name: '어떤 정보를 조회할 수 있나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '급여명세서, 정산 내역, 영업정책, 사내규정, 복리후생, 휴가 정보 등 회사에서 업로드한 모든 문서 정보를 AI가 분석하여 즉시 답변합니다.',
          },
        },
      ],
    },
    // BreadcrumbList
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://modawn.ai/#breadcrumb',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: '홈',
          item: 'https://modawn.ai',
        },
      ],
    },
    // LocalBusiness (for GEO)
    {
      '@type': 'LocalBusiness',
      '@id': 'https://modawn.ai/#localbusiness',
      name: '모드온 AI',
      image: 'https://modawn.ai/logo.png',
      url: 'https://modawn.ai',
      email: 'contact@modawn.ai',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'KR',
        addressLocality: 'Seoul',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 37.5665,
        longitude: 126.978,
      },
      areaServed: {
        '@type': 'Country',
        name: 'South Korea',
      },
      priceRange: '₩₩',
    },
  ],
};

// Viewport Configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1e9df1' },
    { media: '(prefers-color-scheme: dark)', color: '#1c9cf0' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data for SEO/AEO */}
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          strategy="beforeInteractive"
        />
      </head>
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
