// 랜딩 페이지 콘텐츠 (한국어)

export const heroContent = {
  badge: '엔터프라이즈 AI 챗봇',
  headline: ['회사 정보, 이제', '카카오톡으로 물어보세요'],
  subheadline:
    '급여, 영업정책, 사내규정, 복리후생 — 직원들이 궁금한 모든 것을 AI가 즉시 답변합니다. 문서 업로드 한 번이면 세팅 끝. 운영도, 유지보수도 필요 없습니다.',
  stats: [
    { value: '3분', label: '세팅 완료' },
    { value: '4,900원', label: '월/1인' },
    { value: '24/7', label: 'AI 응답' },
  ],
  primaryCta: '무료로 시작하기',
  secondaryCta: '데모 영상 보기',
};

export const socialProofContent = {
  title: '이미 수백 개 기업이 내부 문의를 90% 줄였습니다',
  logos: [
    { name: '스타트업 A', logo: '/logos/startup-a.svg' },
    { name: '제조업 B', logo: '/logos/manufacturing-b.svg' },
    { name: '유통업 C', logo: '/logos/retail-c.svg' },
    { name: '서비스 D', logo: '/logos/service-d.svg' },
    { name: 'IT기업 E', logo: '/logos/it-e.svg' },
    { name: '금융사 F', logo: '/logos/finance-f.svg' },
    { name: '의료 G', logo: '/logos/medical-g.svg' },
    { name: '교육 H', logo: '/logos/education-h.svg' },
  ],
};

export const problemContent = {
  title: '아직도 이런 문제로 고민하시나요?',
  cards: [
    {
      icon: 'ChatCircleDots',
      title: '끝없는 반복 질문',
      description:
        '"영업정책 어디서 봐요?" "이번 달 정산 얼마예요?" "복지포인트 잔액은?" 반복되는 질문에 업무 마비',
    },
    {
      icon: 'Download',
      title: '또 앱 설치?',
      description:
        '회사 앱 설치하라고 하면 직원들 반발. 설치해도 안 쓰고, 설치율 30%도 안 됨',
    },
    {
      icon: 'Question',
      title: 'FAQ는 무용지물',
      description:
        '"내 실적이 얼마인지" 알고 싶은데 일반적인 FAQ로는 개인별 답변 불가',
    },
  ],
};

export const solutionContent = {
  title: '모드온 AI로 단 3분 만에 해결',
  items: [
    {
      icon: 'ChatTeardropDots',
      title: '카카오톡 그대로',
      description: '새 앱 설치 제로. 이미 설치된 카카오톡에서 바로 질문',
      size: 'large',
    },
    {
      icon: 'UserCircle',
      title: '개인별 맞춤 답변',
      description: '"내 정산내역", "내 실적" 등 본인 데이터로 정확한 답변',
      size: 'large',
    },
    {
      icon: 'Upload',
      title: '3분 셋업',
      description: 'Excel 업로드 → 인증코드 공유 → 즉시 사용. 끝.',
      size: 'wide',
    },
    {
      icon: 'ShieldCheck',
      title: 'E2EE 보안',
      description: '종단간 암호화로 민감 정보 완벽 보호',
      size: 'small',
    },
    {
      icon: 'ArrowsClockwise',
      title: '자동 업데이트',
      description: '매일 데이터 분석, 지식베이스 자동 갱신',
      size: 'small',
    },
  ],
};

export const featuresContent = {
  title: '왜 모드온 AI인가요?',
  features: [
    {
      icon: 'ChatCircle',
      title: '카카오톡 = 100% 접근성',
      subtitle: '새 앱? 필요 없습니다',
      points: [
        '국민 메신저 카카오톡 그대로 사용',
        '별도 설치, 회원가입, 로그인 불필요',
        '스마트폰 있으면 누구나 즉시 시작',
        '교육 비용 제로, 적응 기간 제로',
      ],
    },
    {
      icon: 'IdentificationCard',
      title: '진짜 개인화된 답변',
      subtitle: 'FAQ가 아닌 "내 정보"',
      points: [
        '"내 이번 달 정산 얼마야?" 즉시 답변',
        '"영업정책 변경사항" 개인별 안내',
        '복잡한 계산도 자동 처리',
        '개인별 이력, 누적 데이터까지',
      ],
    },
    {
      icon: 'Lightning',
      title: '3분 만에 시작',
      subtitle: '복잡한 연동? 없습니다',
      points: [
        'Excel/PDF 드래그 앤 드롭 업로드',
        '직원별 인증코드 자동 생성',
        '코드 공유하면 즉시 사용 가능',
        'IT팀 없이 관리자 혼자 세팅 완료',
      ],
    },
    {
      icon: 'ShieldCheck',
      title: 'E2EE 최고 보안',
      subtitle: '회사 정보, 철통 보안',
      points: [
        '종단간 암호화(E2EE) 적용',
        '인증된 직원만 본인 정보 조회',
        '접근 로그 전수 기록',
        '금융권 수준 보안 프로토콜',
      ],
    },
  ],
};

export const ragEngineContent = {
  title: 'AI가 매일 더 똑똑해집니다',
  subtitle: '대화 패턴을 분석해 지식베이스를 자동 업데이트합니다',
  queryExample: {
    input: '이번 달 정산금 얼마야?',
    steps: [
      { label: '직원 인증', value: 'J00307' },
      { label: '데이터 조회', value: '정산정보' },
      { label: '계산 처리', value: '공제 반영' },
    ],
    output: '이번 달 정산금은 4,230,500원입니다. (총액 5,000,000원)',
  },
  features: [
    {
      icon: 'Target',
      title: '질문 의도 파악',
      description: '정산/정책/실적 자동 분류',
    },
    {
      icon: 'TreeStructure',
      title: '개인별 데이터 매칭',
      description: '인증코드로 본인 정보만 조회',
    },
    {
      icon: 'Lock',
      title: '권한별 접근',
      description: '레벨별 정보 접근 제어',
    },
    {
      icon: 'ArrowsClockwise',
      title: '일일 자동 학습',
      description: '매일 대화 분석, 지식 업데이트',
    },
  ],
  intentTypes: [
    { type: 'settlement', label: '정산조회', example: '"이번 달 정산"' },
    { type: 'policy', label: '영업정책', example: '"수수료율 안내"' },
    { type: 'history', label: '이력', example: '"지난달과 비교"' },
    { type: 'performance', label: '실적', example: '"내 실적 얼마야"' },
    { type: 'general', label: '일반문의', example: '"정산일 언제야"' },
  ],
};

export const howItWorksContent = {
  title: '3분이면 시작할 수 있습니다',
  steps: [
    {
      icon: 'Upload',
      title: '문서 업로드',
      description: '정산 Excel, 정책 PDF를 드래그 앤 드롭. 형식 자동 인식',
      time: '1분',
    },
    {
      icon: 'Robot',
      title: 'AI 처리',
      description: '모드온 AI가 데이터 파싱, 개인별 분류, 지식베이스 구축',
      time: '자동',
    },
    {
      icon: 'Key',
      title: '인증코드 공유',
      description: '직원별 고유 인증코드 생성. 카톡으로 전달하면 끝',
      time: '1분',
    },
    {
      icon: 'ChatCircle',
      title: '즉시 사용',
      description: '직원이 카카오톡에서 질문하면 AI가 개인 맞춤 답변 제공',
      time: '바로',
    },
  ],
};

export const testimonialsContent = {
  title: '도입 기업들의 실제 후기',
  testimonials: [
    {
      quote:
        '정산일마다 쏟아지던 문의가 사라졌어요. 직원들이 알아서 카톡으로 확인하니까 관리팀이 드디어 본업에 집중합니다.',
      name: '김지현',
      title: '영업관리팀장',
      company: 'GA법인 (설계사 150명)',
    },
    {
      quote:
        '회사 앱 만들었는데 아무도 안 써서 고민이었어요. 카카오톡이니까 설치율 100%. 첫날부터 다들 씁니다.',
      name: '박성민',
      title: '경영지원팀장',
      company: '보험대리점 (설계사 300명)',
    },
    {
      quote:
        '복잡한 정산 계산 때문에 매번 설명하느라 힘들었는데, AI가 개인별로 계산해서 알려주니 문의가 90% 줄었어요.',
      name: '이수진',
      title: '정산팀 과장',
      company: '금융법인 (직원 500명)',
    },
    {
      quote:
        '3분 만에 세팅 끝났다는 게 과장이 아니에요. Excel 올리고 코드 나눠주니까 바로 됐어요. 너무 간단해서 의심했습니다.',
      name: '최민호',
      title: '대표',
      company: '중소기업 (직원 50명)',
    },
  ],
};

export const pricingContent = {
  title: '부담 없는 가격',
  subtitle: '커피 한 잔 값으로 시작하세요',
  price: {
    amount: '4,900',
    unit: '원',
    period: '월 / 1인',
  },
  description: '연 결제 시 20% 할인',
  features: [
    '카카오톡 기반 인증 시스템',
    '직급별 정보 접근 권한 설정',
    '개인별 맞춤 답변',
    '무제한 질문 응답',
    '복잡한 계산 자동 처리',
    'E2EE 종단간 암호화',
    '일일 지식베이스 업데이트',
    '회사 시스템 연동 지원',
  ],
  cta: '14일 무료 체험',
  note: '* 신용카드 등록 없이 무료 체험',
};

export const faqContent = {
  title: '자주 묻는 질문',
  faqs: [
    {
      question: '직원 인증은 어떻게 하나요?',
      answer:
        '카카오톡 기반 인증 시스템을 사용합니다. 직원별로 고유 인증코드가 발급되며, 카카오톡에서 인증코드를 입력하면 본인 정보만 조회할 수 있습니다. 인증되지 않은 사용자는 접근이 불가능합니다.',
    },
    {
      question: '직급별로 접근할 수 있는 정보를 다르게 설정할 수 있나요?',
      answer:
        '네, 정보 접근 등급을 설정할 수 있습니다. 예를 들어 일반 직원은 본인 정산 정보만, 팀장은 팀원 현황까지, 임원은 전체 통계까지 볼 수 있도록 권한을 나눌 수 있습니다.',
    },
    {
      question: '정말 앱 설치 없이 카카오톡만으로 되나요?',
      answer:
        '네, 카카오톡 채널 추가만 하면 됩니다. 직원들이 별도 앱을 설치할 필요가 전혀 없어요. 이미 쓰고 있는 카카오톡에서 바로 질문하면 AI가 답변합니다.',
    },
    {
      question: '회사 정보가 유출될 걱정은 없나요?',
      answer:
        '종단간 암호화(E2EE)를 적용하고 있습니다. 인증된 직원만 권한에 맞는 정보를 조회할 수 있고, 모든 접근 기록은 실시간으로 저장됩니다. 금융권 수준의 보안 프로토콜을 사용합니다.',
    },
    {
      question: '설정에 IT팀 도움이 필요한가요?',
      answer:
        '아니요. 관리자 한 명이 Excel 업로드하고 인증코드 공유하면 끝입니다. IT팀 없이도 3분 안에 세팅할 수 있습니다. 복잡한 연동이 필요하면 저희가 도와드립니다.',
    },
  ],
};

export const poweredByContent = {
  title: 'Powered By',
  subtitle: '최신 AI 기술로 구동됩니다',
  techs: [
    {
      name: 'OpenAI',
      description: '텍스트 임베딩',
      logo: 'openai',
    },
    {
      name: 'Google Gemini',
      description: 'AI 답변 생성',
      logo: 'gemini',
    },
    {
      name: 'Pinecone',
      description: '벡터 검색',
      logo: 'pinecone',
    },
  ],
};

export const ctaContent = {
  title: '반복 문의, 오늘부터 90% 줄이세요',
  subtitle: '새 앱 없이, 3분 세팅으로, 직급별 권한까지 설정 가능',
  primaryCta: '14일 무료 체험 시작',
  secondaryCta: 'info@modawn.ai로 문의하세요',
};

export const footerContent = {
  description: '카카오톡 기반 AI 사내 정보 챗봇',
  company: {
    name: '모드온 AI',
    badge: '벤처기업인증',
    ceo: '대표: 정다운',
    businessNumber: '사업자등록번호: 145-87-03354',
    address: '서울특별시 서초구 사평대로53길 94, 4층',
    email: 'info@modawn.ai',
  },
  links: {
    product: [
      { label: '기능 소개', href: '#features' },
      { label: '요금제', href: '#pricing' },
      { label: '고객 사례', href: '#testimonials' },
    ],
    support: [
      { label: '자주 묻는 질문', href: '#faq' },
      { label: '문의하기', href: 'mailto:info@modawn.ai' },
    ],
    legal: [
      { label: '이용약관', href: '/terms' },
      { label: '개인정보처리방침', href: '/privacy' },
    ],
  },
  copyright: '© 2025 모드온 AI. All rights reserved.',
};

export const navContent = {
  logo: '모드온',
  logoSub: 'Modawn AI',
  links: [
    { label: '기능', href: '#features' },
    { label: '작동방식', href: '#how-it-works' },
    { label: '요금제', href: '#pricing' },
    { label: '고객사례', href: '#testimonials' },
  ],
  cta: {
    login: '로그인',
    signup: '무료 체험',
  },
};
