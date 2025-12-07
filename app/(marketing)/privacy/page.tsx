import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 - 모드온 AI',
  description: '모드온 AI 개인정보처리방침',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            개인정보처리방침
          </h1>
          <p className="text-muted-foreground">
            최종 수정일: 2025년 1월 1일 | 시행일: 2025년 1월 1일
          </p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          {/* 서문 */}
          <section>
            <p className="text-muted-foreground leading-relaxed">
              모드온 AI(이하 &quot;회사&quot;)는 정보주체의 자유와 권리 보호를
              위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수하여,
              적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다. 이에
              「개인정보 보호법」 제30조에 따라 정보주체에게 개인정보 처리에 관한
              절차 및 기준을 안내하고, 이와 관련한 고충을 신속하고 원활하게
              처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을
              수립·공개합니다.
            </p>
          </section>

          {/* 제1조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제1조 (개인정보의 처리 목적)
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는
              개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이
              변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를
              받는 등 필요한 조치를 이행할 예정입니다.
            </p>

            <article className="mt-6">
              <h3 className="text-xl font-medium">1. 회원가입 및 관리</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증,
                회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지,
                고충처리 목적으로 개인정보를 처리합니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">2. 서비스 제공</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                AI 기반 사내 정보 질의응답 서비스 제공, 콘텐츠 제공, 맞춤형
                서비스 제공, 본인인증, 요금결제·정산을 목적으로 개인정보를
                처리합니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">3. 마케팅 및 광고에의 활용</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                신규 서비스(제품) 개발 및 맞춤 서비스 제공, 이벤트 및 광고성
                정보 제공 및 참여기회 제공, 인구통계학적 특성에 따른 서비스 제공
                및 광고 게재, 서비스의 유효성 확인, 접속빈도 파악 또는 회원의
                서비스 이용에 대한 통계 등을 목적으로 개인정보를 처리합니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">4. 민원 처리</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지,
                처리결과 통보 등을 목적으로 개인정보를 처리합니다.
              </p>
            </article>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제2조 (개인정보의 처리 및 보유기간)
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터
              개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서
              개인정보를 처리·보유합니다.
            </p>

            <article className="mt-6">
              <h3 className="text-xl font-medium">1. 회원 가입 및 관리</h3>
              <ul className="mt-2 list-disc list-inside space-y-1 text-muted-foreground">
                <li>보유기간: 회원 탈퇴 시까지</li>
                <li>
                  다만, 다음의 사유에 해당하는 경우에는 해당 사유 종료 시까지
                  <ul className="mt-1 ml-6 list-disc space-y-1">
                    <li>
                      관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는
                      해당 수사·조사 종료 시까지
                    </li>
                    <li>
                      서비스 이용에 따른 채권·채무관계 잔존 시에는 해당
                      채권·채무관계 정산 시까지
                    </li>
                  </ul>
                </li>
              </ul>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">2. 서비스 제공</h3>
              <ul className="mt-2 list-disc list-inside space-y-1 text-muted-foreground">
                <li>보유기간: 서비스 이용계약 해지 시까지</li>
                <li>
                  다만, 다음의 사유에 해당하는 경우에는 해당 기간 종료 시까지
                  <ul className="mt-1 ml-6 list-disc space-y-1">
                    <li>
                      「전자상거래 등에서의 소비자보호에 관한 법률」에 따른 표시·광고에 관한 기록: 6개월
                    </li>
                    <li>
                      계약 또는 청약철회 등에 관한 기록: 5년
                    </li>
                    <li>
                      대금결제 및 재화 등의 공급에 관한 기록: 5년
                    </li>
                    <li>
                      소비자의 불만 또는 분쟁처리에 관한 기록: 3년
                    </li>
                    <li>
                      「통신비밀보호법」에 따른 로그인 기록 등: 3개월
                    </li>
                  </ul>
                </li>
              </ul>
            </article>
          </section>

          {/* 제3조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제3조 (처리하는 개인정보 항목)
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              회사는 다음의 개인정보 항목을 처리하고 있습니다.
            </p>

            <article className="mt-6">
              <h3 className="text-xl font-medium">1. 회원 가입 시</h3>
              <ul className="mt-2 list-disc list-inside space-y-1 text-muted-foreground">
                <li>필수항목: 이메일, 비밀번호, 이름, 회사명, 연락처</li>
                <li>선택항목: 부서명, 직책</li>
              </ul>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">2. 서비스 이용 과정에서 자동 수집</h3>
              <ul className="mt-2 list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  IP주소, 쿠키, MAC주소, 서비스 이용기록, 방문기록, 접속로그,
                  불량 이용기록
                </li>
              </ul>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">3. 유료 서비스 이용 시</h3>
              <ul className="mt-2 list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  신용카드 결제: 카드사명, 카드번호(일부), 결제승인번호
                </li>
                <li>계좌이체: 은행명, 계좌번호</li>
                <li>
                  세금계산서 발행: 사업자등록번호, 대표자명, 사업장 주소
                </li>
              </ul>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">4. 서비스 제공 시 (기업 관리자가 업로드하는 직원 정보)</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                기업 관리자가 서비스 이용을 위해 업로드하는 임직원 관련 정보는
                해당 기업의 책임 하에 적법한 동의를 받아 제공되어야 합니다.
                업로드되는 정보의 항목은 기업 관리자가 결정하며, 회사는 서비스
                제공 목적 범위 내에서만 해당 정보를 처리합니다.
              </p>
            </article>
          </section>

          {/* 제4조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제4조 (개인정보의 제3자 제공)
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한
              범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등
              「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만
              개인정보를 제3자에게 제공합니다.
            </p>

            <article className="mt-6">
              <p className="text-muted-foreground leading-relaxed">
                회사는 다음과 같이 개인정보를 제3자에게 제공하고 있습니다.
              </p>
              <div className="mt-4 rounded-lg border p-4">
                <table className="w-full text-sm text-muted-foreground">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left font-medium">제공받는 자</th>
                      <th className="py-2 text-left font-medium">제공 목적</th>
                      <th className="py-2 text-left font-medium">제공 항목</th>
                      <th className="py-2 text-left font-medium">보유 기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2">결제대행사</td>
                      <td className="py-2">결제 처리</td>
                      <td className="py-2">결제 정보</td>
                      <td className="py-2">결제일로부터 5년</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          {/* 제5조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제5조 (개인정보처리의 위탁)
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보
              처리업무를 위탁하고 있습니다.
            </p>

            <div className="mt-4 rounded-lg border p-4">
              <table className="w-full text-sm text-muted-foreground">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">수탁업체</th>
                    <th className="py-2 text-left font-medium">위탁 업무</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">클라우드 서비스 제공업체</td>
                    <td className="py-2">데이터 저장 및 서버 호스팅</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">결제대행업체</td>
                    <td className="py-2">결제 처리 및 정산</td>
                  </tr>
                  <tr>
                    <td className="py-2">이메일 발송 서비스 업체</td>
                    <td className="py-2">마케팅 및 안내 메일 발송</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-muted-foreground leading-relaxed">
              회사는 위탁계약 체결 시 「개인정보 보호법」 제26조에 따라 위탁업무
              수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁
              제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을
              계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를
              감독하고 있습니다.
            </p>
          </section>

          {/* 제6조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제6조 (개인정보의 국외 이전)
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              회사는 서비스 제공을 위해 다음과 같이 개인정보를 국외로 이전하고
              있습니다.
            </p>

            <div className="mt-4 rounded-lg border p-4">
              <table className="w-full text-sm text-muted-foreground">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">이전되는 국가</th>
                    <th className="py-2 text-left font-medium">이전 목적</th>
                    <th className="py-2 text-left font-medium">이전 항목</th>
                    <th className="py-2 text-left font-medium">이전 일시 및 방법</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2">미국 등</td>
                    <td className="py-2">
                      클라우드 서비스 인프라 제공, AI 서비스 제공
                    </td>
                    <td className="py-2">
                      서비스 이용 과정에서 수집되는 정보
                    </td>
                    <td className="py-2">
                      서비스 이용 시 네트워크를 통한 전송
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-muted-foreground leading-relaxed">
              회사는 개인정보 국외 이전 시 「개인정보 보호법」 제28조의8에 따라
              개인정보가 안전하게 처리될 수 있도록 보호조치를 적용합니다.
            </p>
          </section>

          {/* 제7조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제7조 (개인정보의 파기절차 및 방법)
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가
              불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
            </p>

            <article className="mt-6">
              <h3 className="text-xl font-medium">1. 파기절차</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의
                개인정보보호책임자의 승인을 받아 개인정보를 파기합니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">2. 파기방법</h3>
              <ul className="mt-2 list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  전자적 파일 형태의 정보: 기록을 재생할 수 없는 기술적 방법을
                  사용
                </li>
                <li>
                  종이에 출력된 개인정보: 분쇄기로 분쇄하거나 소각
                </li>
              </ul>
            </article>
          </section>

          {/* 제8조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제8조 (정보주체와 법정대리인의 권리·의무 및 행사방법)
            </h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">1. 권리 행사</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                정보주체(만 14세 미만인 경우에는 법정대리인)는 회사에 대해 언제든지
                다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-muted-foreground">
                <li>개인정보 열람 요구</li>
                <li>오류 등이 있을 경우 정정 요구</li>
                <li>삭제 요구</li>
                <li>처리정지 요구</li>
              </ul>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">2. 권리 행사 방법</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                위 권리 행사는 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수
                있으며 회사는 이에 대해 지체없이 조치하겠습니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">3. 대리인을 통한 권리 행사</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한
                경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를
                이용하거나 제공하지 않습니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">4. 권리 행사의 제한</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                권리 행사는 정보주체의 법정대리인이나 위임을 받은 자 등 대리인을
                통하여 하실 수도 있습니다. 이 경우 &quot;개인정보 처리 방법에
                관한 고시(제2020-7호)&quot; 별지 제11호 서식에 따른 위임장을
                제출하셔야 합니다.
              </p>
            </article>
          </section>

          {/* 제9조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제9조 (개인정보의 안전성 확보조치)
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고
              있습니다.
            </p>

            <ul className="mt-4 list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <strong>관리적 조치:</strong> 내부관리계획 수립·시행, 정기적
                직원 교육 등
              </li>
              <li>
                <strong>기술적 조치:</strong> 개인정보처리시스템 등의 접근권한
                관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램
                설치
              </li>
              <li>
                <strong>물리적 조치:</strong> 전산실, 자료보관실 등의 접근통제
              </li>
              <li>
                <strong>데이터 암호화:</strong> 개인정보는 암호화되어 저장 및
                전송됩니다
              </li>
              <li>
                <strong>접속기록 보관:</strong> 개인정보처리시스템에 접속한
                기록을 최소 1년 이상 보관·관리
              </li>
            </ul>
          </section>

          {/* 제10조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제10조 (개인정보 자동 수집 장치의 설치·운영 및 거부)
            </h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">1. 쿠키의 사용 목적</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용정보를
                저장하고 수시로 불러오는 &apos;쿠키(cookie)&apos;를 사용합니다.
                쿠키는 웹사이트를 운영하는데 이용되는 서버가 이용자의 컴퓨터
                브라우저에게 보내는 소량의 정보이며 이용자의 컴퓨터 하드디스크에
                저장됩니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">2. 쿠키의 설치·운영 및 거부</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 웹브라우저에서
                옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다
                확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다.
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  Chrome: 설정 → 개인정보 및 보안 → 쿠키 및 기타 사이트 데이터
                </li>
                <li>
                  Safari: 환경설정 → 개인정보보호 → 쿠키 및 웹사이트 데이터
                </li>
                <li>
                  Firefox: 설정 → 개인정보 및 보안 → 쿠키 및 사이트 데이터
                </li>
                <li>Edge: 설정 → 쿠키 및 사이트 권한 → 쿠키 및 사이트 데이터</li>
              </ul>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">3. 쿠키 저장 거부 시 영향</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 발생할 수
                있습니다.
              </p>
            </article>
          </section>

          {/* 제11조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제11조 (행태정보의 수집·이용·제공 및 거부)
            </h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">1. 수집하는 행태정보</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                회사는 서비스 이용과정에서 이용자에 관한 다음과 같은 정보를
                자동으로 생성하여 수집할 수 있습니다.
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-muted-foreground">
                <li>서비스 이용기록, 검색기록, 클릭기록</li>
                <li>AI 서비스 질의응답 기록</li>
              </ul>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">2. 행태정보 수집 목적</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                이용자의 관심, 성향에 기반한 개인 맞춤형 서비스 제공 및 서비스
                품질 개선
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">3. 보유·이용기간</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                수집일로부터 1년
              </p>
            </article>
          </section>

          {/* 제12조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제12조 (추가적인 이용·제공 판단기준)
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              회사는 「개인정보 보호법」 제15조제3항 및 제17조제4항에 따라
              개인정보 보호위원회가 고시하는 지침에 의거하여, 정보주체의 동의
              없이 개인정보를 추가적으로 이용·제공할 수 있습니다. 이에 따라
              회사가 정보주체의 동의 없이 추가적인 이용·제공을 하기 위해서
              다음과 같은 사항을 고려합니다.
            </p>
            <ul className="mt-4 list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                개인정보를 추가적으로 이용·제공하려는 목적이 당초 수집 목적과
                관련성이 있는지 여부
              </li>
              <li>
                개인정보를 수집한 정황 또는 처리 관행에 비추어 볼 때 추가적인
                이용·제공에 대한 예측 가능성이 있는지 여부
              </li>
              <li>
                개인정보의 추가적인 이용·제공이 정보주체의 이익을 부당하게
                침해하는지 여부
              </li>
              <li>
                가명처리 또는 암호화 등 안전성 확보에 필요한 조치를 하였는지 여부
              </li>
            </ul>
          </section>

          {/* 제13조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제13조 (가명정보의 처리)
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              회사는 통계작성, 과학적 연구, 공익적 기록보존 등을 위하여
              수집한 개인정보를 특정 개인을 알아볼 수 없도록 가명처리하여
              처리할 수 있습니다. 가명정보는 재식별되지 않도록 추가정보와
              분리하여 별도로 저장·관리하고, 필요한 기술적·관리적 보호조치를
              취합니다.
            </p>
          </section>

          {/* 제14조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제14조 (개인정보 보호책임자)
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보
              처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와
              같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>

            <div className="mt-4 rounded-lg border bg-muted/30 p-4">
              <h4 className="font-medium">개인정보 보호책임자</h4>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>성명: 정다운</li>
                <li>직책: 대표이사</li>
                <li>연락처: info@modawn.ai</li>
              </ul>
            </div>

            <p className="mt-4 text-muted-foreground leading-relaxed">
              정보주체께서는 회사의 서비스를 이용하시면서 발생한 모든 개인정보
              보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보
              보호책임자에게 문의하실 수 있습니다. 회사는 정보주체의 문의에
              대해 지체 없이 답변 및 처리해드릴 것입니다.
            </p>
          </section>

          {/* 제15조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제15조 (권익침해 구제방법)
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보
              분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에
              분쟁해결이나 상담 등을 신청할 수 있습니다.
            </p>

            <div className="mt-4 space-y-3 text-muted-foreground">
              <div className="rounded-lg border p-3">
                <p className="font-medium">개인정보 분쟁조정위원회</p>
                <p>전화: 1833-6972 (www.kopico.go.kr)</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium">개인정보침해신고센터</p>
                <p>전화: (국번없이) 118 (privacy.kisa.or.kr)</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium">대검찰청</p>
                <p>전화: (국번없이) 1301 (www.spo.go.kr)</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium">경찰청</p>
                <p>전화: (국번없이) 182 (ecrm.cyber.go.kr)</p>
              </div>
            </div>
          </section>

          {/* 제16조 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제16조 (개인정보 처리방침의 변경)
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              이 개인정보처리방침은 2025년 1월 1일부터 적용됩니다. 개인정보
              처리방침 내용 추가, 삭제 및 수정이 있을 시에는 변경사항의 시행
              7일 전부터 서비스 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>

          {/* 부칙 */}
          <section className="mt-12 border-t pt-8">
            <h2 className="text-xl font-semibold">부칙</h2>
            <p className="mt-4 text-muted-foreground">
              이 개인정보처리방침은 2025년 1월 1일부터 시행합니다.
            </p>
          </section>

          {/* 문의처 */}
          <section className="mt-8 rounded-lg border bg-muted/30 p-6">
            <h3 className="text-lg font-medium">문의처</h3>
            <div className="mt-4 space-y-2 text-muted-foreground">
              <p>모드온 AI</p>
              <p>개인정보 보호책임자: 정다운</p>
              <p>이메일: info@modawn.ai</p>
              <p>주소: 서울특별시 서초구 사평대로53길 94, 4층</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
