import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관 - 모드온 AI',
  description: '모드온 AI 서비스 이용약관',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">이용약관</h1>
          <p className="text-muted-foreground">
            최종 수정일: 2025년 1월 1일 | 시행일: 2025년 1월 1일
          </p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          {/* 제1장 총칙 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">제1장 총칙</h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제1조 (목적)</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                이 약관은 모드온 AI(이하 &quot;회사&quot;라 합니다)가 제공하는
                AI 기반 사내 정보 챗봇 서비스(이하 &quot;서비스&quot;라 합니다)의
                이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타
                필요한 사항을 규정함을 목적으로 합니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제2조 (정의)</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                이 약관에서 사용하는 용어의 정의는 다음과 같습니다.
              </p>
              <ol className="mt-3 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  &quot;서비스&quot;란 회사가 제공하는 AI 기반 사내 정보 조회 및
                  질의응답 시스템을 의미합니다.
                </li>
                <li>
                  &quot;이용자&quot;란 이 약관에 따라 회사가 제공하는 서비스를
                  이용하는 기업 또는 개인을 말합니다.
                </li>
                <li>
                  &quot;기업 관리자&quot;란 서비스 이용 계약을 체결하고 서비스
                  관리 권한을 보유한 자를 말합니다.
                </li>
                <li>
                  &quot;최종 사용자&quot;란 기업 관리자로부터 인증코드를 부여받아
                  서비스를 실제 이용하는 임직원을 말합니다.
                </li>
                <li>
                  &quot;인증코드&quot;란 최종 사용자 식별 및 권한 확인을 위해
                  발급되는 고유 코드를 말합니다.
                </li>
                <li>
                  &quot;지식베이스&quot;란 서비스 제공을 위해 구축된 기업별 정보
                  데이터베이스를 말합니다.
                </li>
                <li>
                  &quot;콘텐츠&quot;란 이용자가 서비스에 업로드하는 문서, 데이터,
                  정보 등 일체의 자료를 말합니다.
                </li>
              </ol>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제3조 (약관의 효력 및 변경)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게
                  공지함으로써 효력이 발생합니다.
                </li>
                <li>
                  회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수
                  있으며, 변경 시 적용일자 및 변경사유를 명시하여 현행 약관과
                  함께 서비스 초기화면 또는 공지사항에 그 적용일자 7일 전부터
                  공지합니다. 다만, 이용자에게 불리한 약관 변경의 경우에는 30일
                  전부터 공지합니다.
                </li>
                <li>
                  이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고
                  이용계약을 해지할 수 있습니다. 변경된 약관의 효력 발생일 이후에도
                  서비스를 계속 이용하는 경우에는 약관 변경에 동의한 것으로
                  간주합니다.
                </li>
              </ol>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제4조 (약관 외 준칙)</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                이 약관에 명시되지 않은 사항은 전기통신사업법, 정보통신망 이용촉진
                및 정보보호 등에 관한 법률, 개인정보 보호법 등 관련 법령 및
                회사가 정한 서비스의 세부 이용지침 등의 규정에 따릅니다.
              </p>
            </article>
          </section>

          {/* 제2장 서비스 이용계약 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제2장 서비스 이용계약
            </h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제5조 (이용계약의 성립)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  이용계약은 이용자가 이 약관에 동의하고 회사가 정한 가입절차에
                  따라 서비스 이용을 신청한 후, 회사가 이를 승낙함으로써
                  성립합니다.
                </li>
                <li>
                  회사는 이용자의 신청에 대하여 서비스 이용을 승낙함을 원칙으로
                  합니다. 다만, 다음 각 호에 해당하는 경우에는 이용 신청을
                  승낙하지 않거나 사후에 이용계약을 해지할 수 있습니다.
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    <li>실명이 아니거나 타인의 명의를 이용한 경우</li>
                    <li>허위의 정보를 기재하거나 필수 정보를 기재하지 않은 경우</li>
                    <li>
                      이전에 서비스 이용자격을 상실한 적이 있는 경우 (다만, 회사의
                      재이용 승낙을 얻은 경우는 예외)
                    </li>
                    <li>
                      기타 이용 신청을 승낙하는 것이 회사 기술상 현저히 지장이
                      있다고 판단되는 경우
                    </li>
                  </ul>
                </li>
              </ol>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제6조 (이용자 정보의 변경)</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                이용자는 서비스 가입 시 기재한 정보가 변경되었을 경우 즉시 변경된
                정보를 회사에 통지하여야 합니다. 변경 통지 지연으로 인한 불이익에
                대해서는 회사가 책임지지 않습니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제7조 (이용계약의 해지)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  이용자가 서비스 이용계약을 해지하고자 하는 경우에는 회사가 정한
                  절차에 따라 해지 신청을 하여야 합니다.
                </li>
                <li>
                  회사는 이용자가 다음 각 호에 해당하는 행위를 하였을 경우 사전
                  통보 없이 이용계약을 해지하거나 서비스 이용을 제한할 수
                  있습니다.
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    <li>타인의 정보를 도용한 경우</li>
                    <li>
                      서비스 운영을 고의로 방해한 경우
                    </li>
                    <li>
                      서비스를 이용하여 법령 또는 이 약관이 금지하는 행위를 한
                      경우
                    </li>
                    <li>
                      기타 회사가 합리적인 판단에 기하여 서비스 제공을 거부할
                      필요가 있다고 인정할 경우
                    </li>
                  </ul>
                </li>
                <li>
                  이용계약이 해지된 경우 이용자의 콘텐츠 및 데이터는 관련 법령 및
                  개인정보처리방침에 따라 처리됩니다.
                </li>
              </ol>
            </article>
          </section>

          {/* 제3장 서비스 이용 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제3장 서비스 이용
            </h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제8조 (서비스의 제공)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  회사는 다음과 같은 서비스를 제공합니다.
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    <li>AI 기반 사내 정보 질의응답 서비스</li>
                    <li>문서 업로드 및 자동 분석 서비스</li>
                    <li>개인별 맞춤 정보 조회 서비스</li>
                    <li>직급별 접근 권한 관리 서비스</li>
                    <li>기타 회사가 정하는 서비스</li>
                  </ul>
                </li>
                <li>
                  서비스는 연중무휴 24시간 제공함을 원칙으로 합니다. 다만, 회사는
                  시스템 정기점검, 증설 및 교체를 위해 회사가 정한 날이나 시간에
                  서비스를 일시 중단할 수 있으며, 예정되어 있는 작업으로 인한
                  서비스 일시 중단은 서비스를 통해 사전에 공지합니다.
                </li>
                <li>
                  회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절
                  또는 운영상 상당한 이유가 있는 경우 서비스의 제공을 일시적으로
                  중단할 수 있습니다.
                </li>
              </ol>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제9조 (서비스의 변경 및 중단)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  회사는 상당한 이유가 있는 경우에 운영상, 기술상의 필요에 따라
                  제공하고 있는 서비스를 변경할 수 있습니다.
                </li>
                <li>
                  회사는 서비스의 전부 또는 일부를 변경하거나 중단하고자 할 경우
                  그 사유와 변경 또는 중단 예정일을 서비스 공지사항 또는 전자우편
                  등의 방법으로 이용자에게 30일 전에 통지합니다.
                </li>
                <li>
                  회사는 무료로 제공되는 서비스의 일부 또는 전부를 회사의 정책 및
                  운영의 필요상 수정, 중단, 변경할 수 있으며, 이에 대하여
                  이용자에게 별도의 보상을 하지 않습니다.
                </li>
              </ol>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제10조 (콘텐츠의 관리)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  이용자가 서비스에 업로드한 콘텐츠의 저작권은 해당 이용자에게
                  귀속됩니다.
                </li>
                <li>
                  회사는 이용자가 업로드한 콘텐츠가 다음 각 호에 해당한다고 판단되는
                  경우 사전 통보 없이 삭제하거나 이동 또는 등록을 거부할 수
                  있습니다.
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    <li>
                      다른 이용자 또는 제3자를 비방하거나 명예를 훼손하는 내용
                    </li>
                    <li>공공질서 및 미풍양속에 위반되는 내용</li>
                    <li>범죄적 행위에 결부된다고 인정되는 내용</li>
                    <li>
                      회사 또는 제3자의 저작권 등 기타 권리를 침해하는 내용
                    </li>
                    <li>법령에 위반되는 내용</li>
                  </ul>
                </li>
                <li>
                  이용자는 자신의 콘텐츠에 대한 백업 책임이 있으며, 회사는
                  이용자의 콘텐츠 손실에 대해 책임지지 않습니다. 다만, 회사는
                  서비스의 안정적 운영을 위해 합리적인 범위 내에서 백업 시스템을
                  운영합니다.
                </li>
              </ol>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제11조 (AI 서비스 이용)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  회사의 AI 서비스는 이용자가 업로드한 콘텐츠를 기반으로 답변을
                  생성합니다.
                </li>
                <li>
                  AI 서비스가 제공하는 답변은 참고 목적으로만 사용되어야 하며,
                  최종 의사결정은 이용자의 책임 하에 이루어져야 합니다.
                </li>
                <li>
                  회사는 AI 서비스의 답변 정확성을 보장하지 않으며, AI 서비스
                  답변에 기반한 이용자의 결정에 대해 책임지지 않습니다.
                </li>
                <li>
                  이용자는 AI 서비스를 불법적인 목적이나 악의적인 용도로 사용해서는
                  안 됩니다.
                </li>
              </ol>
            </article>
          </section>

          {/* 제4장 이용자의 권리와 의무 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제4장 이용자의 권리와 의무
            </h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제12조 (이용자의 의무)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  이용자는 다음 행위를 하여서는 안 됩니다.
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    <li>신청 또는 변경 시 허위 내용의 등록</li>
                    <li>타인의 정보 도용</li>
                    <li>회사가 게시한 정보의 변경</li>
                    <li>
                      회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신
                      또는 게시
                    </li>
                    <li>
                      회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해
                    </li>
                    <li>
                      회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는
                      행위
                    </li>
                    <li>
                      외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에
                      반하는 정보를 서비스에 공개 또는 게시하는 행위
                    </li>
                    <li>
                      서비스를 이용하여 얻은 정보를 회사의 사전 승낙 없이
                      복제하거나 이를 출판, 방송 등에 사용하거나 제3자에게
                      제공하는 행위
                    </li>
                    <li>
                      서비스의 안정적인 운영을 방해할 목적으로 다량의 정보를
                      전송하거나 수신자의 의사에 반하여 광고성 정보를 전송하는
                      행위
                    </li>
                    <li>
                      기타 불법적이거나 부당한 행위
                    </li>
                  </ul>
                </li>
                <li>
                  이용자는 관계법령, 이 약관의 규정, 이용안내 및 서비스와 관련하여
                  공지한 주의사항, 회사가 통지하는 사항 등을 준수하여야 하며,
                  기타 회사의 업무에 방해되는 행위를 하여서는 안 됩니다.
                </li>
              </ol>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제13조 (계정 및 인증코드 관리)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  이용자는 자신의 계정 정보 및 인증코드를 안전하게 관리해야 하며,
                  이를 제3자에게 공유하거나 양도해서는 안 됩니다.
                </li>
                <li>
                  기업 관리자는 최종 사용자에게 발급한 인증코드의 적절한 배포 및
                  관리에 대한 책임이 있습니다.
                </li>
                <li>
                  계정 정보 또는 인증코드의 부정 사용으로 인해 발생하는 모든
                  책임은 이용자에게 있으며, 회사는 이로 인한 손해에 대해 책임지지
                  않습니다.
                </li>
                <li>
                  이용자는 계정 정보 또는 인증코드가 도용되거나 제3자가 사용하고
                  있음을 인지한 경우 이를 즉시 회사에 통보하고 회사의 안내에
                  따라야 합니다.
                </li>
              </ol>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제14조 (기업 관리자의 책임)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  기업 관리자는 서비스에 업로드하는 콘텐츠의 정확성, 적법성 및
                  적절성에 대한 책임이 있습니다.
                </li>
                <li>
                  기업 관리자는 자사 임직원의 개인정보를 서비스에 업로드하기 전에
                  해당 임직원으로부터 적법한 동의를 받아야 합니다.
                </li>
                <li>
                  기업 관리자는 직급별 접근 권한을 적절히 설정하고 관리할 책임이
                  있습니다.
                </li>
              </ol>
            </article>
          </section>

          {/* 제5장 회사의 의무 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제5장 회사의 의무
            </h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제15조 (회사의 의무)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  회사는 관련 법령과 이 약관이 금지하거나 미풍양속에 반하는 행위를
                  하지 않으며, 계속적이고 안정적으로 서비스를 제공하기 위하여
                  최선을 다하여 노력합니다.
                </li>
                <li>
                  회사는 이용자가 안전하게 서비스를 이용할 수 있도록 개인정보
                  보호를 위해 보안시스템을 갖추어야 하며 개인정보처리방침을
                  공시하고 준수합니다.
                </li>
                <li>
                  회사는 서비스 이용과 관련하여 이용자로부터 제기된 의견이나
                  불만이 정당하다고 인정할 경우에는 이를 처리하여야 합니다.
                  이용자가 제기한 의견이나 불만사항에 대해서는 게시판을 활용하거나
                  전자우편 등을 통하여 이용자에게 처리과정 및 결과를 전달합니다.
                </li>
              </ol>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제16조 (개인정보의 보호)</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                회사는 이용자의 개인정보를 보호하기 위해 개인정보 보호법 등 관련
                법령에서 정하는 바에 따라 이용자의 개인정보를 보호하기 위해
                노력합니다. 개인정보의 보호 및 사용에 대해서는 관련법령 및 회사의
                개인정보처리방침이 적용됩니다.
              </p>
            </article>
          </section>

          {/* 제6장 요금 및 결제 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제6장 요금 및 결제
            </h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제17조 (이용요금)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  서비스의 이용요금은 회사가 별도로 정한 요금정책에 따르며,
                  서비스 화면에 게시합니다.
                </li>
                <li>
                  회사는 이용요금을 변경할 수 있으며, 변경 시 변경사유와 적용일자를
                  명시하여 적용일자 30일 전에 서비스 화면 또는 전자우편을 통해
                  공지합니다.
                </li>
                <li>
                  이용자가 요금 변경에 동의하지 않는 경우 서비스 이용계약을 해지할
                  수 있습니다.
                </li>
              </ol>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제18조 (결제 및 환불)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  이용요금의 결제는 신용카드, 계좌이체 등 회사가 정한 방법으로
                  합니다.
                </li>
                <li>
                  이용요금은 선불제를 원칙으로 하며, 월 단위 또는 연 단위로 결제할
                  수 있습니다.
                </li>
                <li>
                  환불은 다음과 같이 처리됩니다.
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    <li>
                      무료 체험 기간 중 해지: 별도 비용 없이 해지
                    </li>
                    <li>
                      유료 이용 중 해지: 이미 경과한 기간에 해당하는 요금을
                      공제한 잔액 환불. 단, 월 단위 결제의 경우 해당 월 이용요금은
                      환불되지 않습니다.
                    </li>
                    <li>
                      회사의 귀책사유로 인한 서비스 중단: 잔여 이용기간에 해당하는
                      요금 전액 환불
                    </li>
                  </ul>
                </li>
                <li>
                  환불 신청은 고객센터를 통해 접수하며, 신청일로부터 영업일 기준
                  7일 이내에 처리됩니다.
                </li>
              </ol>
            </article>
          </section>

          {/* 제7장 손해배상 및 면책 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              제7장 손해배상 및 면책
            </h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제19조 (손해배상)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  회사가 이 약관의 규정을 위반한 행위로 이용자에게 손해를 입히거나
                  기타 회사가 제공하는 모든 서비스와 관련하여 회사의 귀책사유로
                  인해 이용자에게 손해가 발생한 경우 회사는 그 손해를 배상하여야
                  합니다.
                </li>
                <li>
                  회사의 손해배상 책임은 직접 손해에 한정되며, 이용자가 회사에
                  지급한 서비스 이용요금을 상한으로 합니다.
                </li>
                <li>
                  이용자가 이 약관의 규정을 위반함으로 인하여 회사에 손해가 발생한
                  경우 이용자는 회사에 발생한 손해를 배상해야 합니다.
                </li>
              </ol>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제20조 (면책사항)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를
                  제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
                </li>
                <li>
                  회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여는
                  책임을 지지 않습니다.
                </li>
                <li>
                  회사는 이용자가 서비스와 관련하여 게재한 정보, 자료, 사실의
                  신뢰도, 정확성 등의 내용에 관하여는 책임을 지지 않습니다.
                </li>
                <li>
                  회사는 이용자 간 또는 이용자와 제3자 상호간에 서비스를 매개로
                  하여 거래 등을 한 경우에는 책임이 면제됩니다.
                </li>
                <li>
                  회사는 무료로 제공되는 서비스 이용과 관련하여 관련법에 특별한
                  규정이 없는 한 책임을 지지 않습니다.
                </li>
                <li>
                  회사는 AI 서비스가 제공하는 답변의 정확성, 완전성, 적시성에
                  대해 보증하지 않으며, AI 답변에 기반한 이용자의 의사결정에 대해
                  책임지지 않습니다.
                </li>
                <li>
                  회사는 이용자가 업로드한 콘텐츠의 정확성, 적법성에 대해 책임지지
                  않습니다.
                </li>
              </ol>
            </article>
          </section>

          {/* 제8장 기타 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">제8장 기타</h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제21조 (저작권의 귀속)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  서비스에 대한 저작권 및 지적재산권은 회사에 귀속됩니다.
                </li>
                <li>
                  이용자가 서비스에 업로드한 콘텐츠의 저작권은 해당 이용자에게
                  귀속되며, 회사는 서비스 제공 목적 범위 내에서 해당 콘텐츠를
                  사용할 수 있는 권한을 부여받습니다.
                </li>
                <li>
                  이용자는 서비스를 이용함으로써 얻은 정보를 회사의 사전 승낙 없이
                  복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로
                  이용하거나 제3자에게 이용하게 하여서는 안 됩니다.
                </li>
              </ol>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제22조 (분쟁해결)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그
                  피해를 보상처리하기 위하여 고객센터를 운영합니다.
                </li>
                <li>
                  회사는 이용자로부터 제출되는 불만사항 및 의견은 우선적으로
                  그 사항을 처리합니다. 다만, 신속한 처리가 곤란한 경우에는
                  이용자에게 그 사유와 처리일정을 즉시 통보해 드립니다.
                </li>
              </ol>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">제23조 (재판권 및 준거법)</h3>
              <ol className="mt-2 list-decimal list-inside space-y-2 text-muted-foreground">
                <li>
                  회사와 이용자 간에 발생한 서비스 이용에 관한 분쟁에 대하여는
                  대한민국 법을 적용합니다.
                </li>
                <li>
                  회사와 이용자 간에 발생한 분쟁에 관한 소송은 회사의 본사 소재지를
                  관할하는 법원을 전속적 관할법원으로 합니다.
                </li>
              </ol>
            </article>
          </section>

          {/* 부칙 */}
          <section className="mt-12 border-t pt-8">
            <h2 className="text-xl font-semibold">부칙</h2>
            <p className="mt-4 text-muted-foreground">
              이 약관은 2025년 1월 1일부터 시행합니다.
            </p>
          </section>

          {/* 문의처 */}
          <section className="mt-8 rounded-lg border bg-muted/30 p-6">
            <h3 className="text-lg font-medium">문의처</h3>
            <div className="mt-4 space-y-2 text-muted-foreground">
              <p>모드온 AI</p>
              <p>이메일: info@modawn.ai</p>
              <p>주소: 서울특별시 서초구 사평대로53길 94, 4층</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
