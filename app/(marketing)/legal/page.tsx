import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '법적 고지 - 모드온 AI',
  description: '모드온 AI 법적 고지 및 면책조항',
};

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">법적 고지</h1>
          <p className="text-muted-foreground">
            최종 수정일: 2025년 1월 1일
          </p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          {/* 회사 정보 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">회사 정보</h2>
            <div className="mt-4 rounded-lg border bg-muted/30 p-6">
              <dl className="space-y-3 text-muted-foreground">
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <dt className="font-medium min-w-[140px]">상호명</dt>
                  <dd>모드온 AI (Modawn AI)</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <dt className="font-medium min-w-[140px]">대표자</dt>
                  <dd>정다운</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <dt className="font-medium min-w-[140px]">사업자등록번호</dt>
                  <dd>145-87-03354</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <dt className="font-medium min-w-[140px]">통신판매업신고</dt>
                  <dd>제2025-서울서초-0000호</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <dt className="font-medium min-w-[140px]">소재지</dt>
                  <dd>서울특별시 서초구 사평대로53길 94, 4층</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <dt className="font-medium min-w-[140px]">이메일</dt>
                  <dd>info@modawn.ai</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:gap-4">
                  <dt className="font-medium min-w-[140px]">기업 유형</dt>
                  <dd>벤처기업인증</dd>
                </div>
              </dl>
            </div>
          </section>

          {/* 저작권 고지 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">저작권 고지</h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">1. 저작권 귀속</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                본 웹사이트 및 서비스에 게시된 모든 콘텐츠(텍스트, 이미지, 그래픽,
                로고, 아이콘, 소프트웨어, 데이터베이스 등)에 대한 저작권 및 기타
                지적재산권은 모드온 AI 또는 해당 권리자에게 귀속됩니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">2. 이용 제한</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                모드온 AI의 사전 서면 동의 없이 본 웹사이트 또는 서비스의 콘텐츠를
                복제, 배포, 전송, 전시, 수정, 2차적 저작물 작성 또는 상업적으로
                이용하는 것은 금지됩니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">3. 허용되는 이용</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                개인적이고 비상업적인 목적을 위해 본 웹사이트의 콘텐츠를 열람하고
                일시적으로 저장하는 것은 허용됩니다. 단, 저작권 표시 및 기타 권리
                표시를 제거하거나 변경해서는 안 됩니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">4. 저작권 침해 신고</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                본 웹사이트 또는 서비스에서 귀하의 저작권을 침해하는 콘텐츠를
                발견하신 경우, 아래 연락처로 신고해 주시기 바랍니다.
              </p>
              <ul className="mt-2 list-disc list-inside text-muted-foreground">
                <li>이메일: info@modawn.ai</li>
                <li>
                  필요 정보: 침해 주장 콘텐츠의 위치, 저작권 소유 증명 자료,
                  연락처 정보
                </li>
              </ul>
            </article>
          </section>

          {/* 상표권 고지 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">상표권 고지</h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">1. 회사 상표</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                &quot;모드온&quot;, &quot;모드온 AI&quot;, &quot;Modawn&quot;,
                &quot;Modawn AI&quot; 및 관련 로고는 모드온 AI의 등록상표 또는
                상표입니다. 이러한 상표의 무단 사용은 금지됩니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">2. 제3자 상표</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                본 웹사이트에 표시된 제3자의 상표, 서비스 마크, 로고는 각 소유자의
                재산입니다. 이러한 상표의 사용은 해당 소유자의 승인을 의미하지
                않으며, 모드온 AI와 해당 상표 소유자 간의 제휴 또는 후원 관계를
                암시하지 않습니다.
              </p>
            </article>
          </section>

          {/* 면책조항 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">면책조항</h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">1. 정보의 정확성</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                본 웹사이트 및 서비스에서 제공하는 정보는 일반적인 안내 목적으로만
                제공됩니다. 모드온 AI는 제공되는 정보의 정확성, 완전성, 적시성에
                대해 명시적 또는 묵시적 보증을 하지 않습니다. 정보의 이용으로
                인해 발생하는 어떠한 손해에 대해서도 모드온 AI는 책임을 지지
                않습니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">2. AI 서비스에 관한 면책</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                모드온 AI가 제공하는 AI 기반 질의응답 서비스는 인공지능 기술을
                활용하여 답변을 생성합니다. 이러한 AI 생성 답변은 다음과 같은
                제한사항이 있습니다.
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  AI가 생성한 답변은 참고 목적으로만 사용되어야 하며, 전문적인
                  조언을 대체하지 않습니다.
                </li>
                <li>
                  AI 답변의 정확성, 완전성, 신뢰성을 보장하지 않습니다.
                </li>
                <li>
                  중요한 의사결정은 반드시 해당 분야 전문가와 상담 후 진행하시기
                  바랍니다.
                </li>
                <li>
                  AI 답변에 기반한 결정으로 인해 발생하는 손해에 대해 모드온 AI는
                  책임을 지지 않습니다.
                </li>
              </ul>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">3. 서비스 가용성</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                모드온 AI는 서비스의 지속적인 가용성을 위해 노력하나, 시스템 점검,
                업그레이드, 기술적 문제, 또는 기타 예측할 수 없는 상황으로 인해
                서비스가 일시적으로 중단될 수 있습니다. 이러한 서비스 중단으로
                인한 손해에 대해 모드온 AI는 책임을 지지 않습니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">4. 제3자 링크</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                본 웹사이트에는 제3자 웹사이트로의 링크가 포함될 수 있습니다.
                이러한 외부 링크는 편의를 위해 제공되며, 모드온 AI는 외부
                웹사이트의 콘텐츠, 개인정보 보호 정책, 또는 관행에 대해 책임을
                지지 않습니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">5. 책임의 제한</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                관련 법령이 허용하는 최대 범위 내에서, 모드온 AI는 본 웹사이트
                또는 서비스의 이용과 관련하여 발생하는 직접적, 간접적, 부수적,
                결과적, 특별 또는 징벌적 손해에 대해 책임을 지지 않습니다.
              </p>
            </article>
          </section>

          {/* 이용자 업로드 콘텐츠 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              이용자 업로드 콘텐츠
            </h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">1. 콘텐츠 책임</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                이용자가 서비스에 업로드하는 모든 콘텐츠(문서, 데이터, 정보 등)에
                대한 책임은 해당 이용자에게 있습니다. 모드온 AI는 이용자가 업로드한
                콘텐츠의 정확성, 적법성, 저작권 준수 여부에 대해 책임지지 않습니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">2. 개인정보 포함 콘텐츠</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                이용자가 타인의 개인정보가 포함된 콘텐츠를 서비스에 업로드하는
                경우, 해당 개인으로부터 적법한 동의를 받아야 하며, 이에 대한
                책임은 전적으로 이용자에게 있습니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">3. 콘텐츠 라이선스</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                이용자가 서비스에 업로드한 콘텐츠의 저작권은 해당 이용자에게
                귀속됩니다. 다만, 이용자는 모드온 AI가 서비스 제공 목적에 필요한
                범위 내에서 해당 콘텐츠를 사용할 수 있는 비독점적 라이선스를
                부여합니다.
              </p>
            </article>
          </section>

          {/* 보안 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">보안</h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">1. 데이터 보안</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                모드온 AI는 이용자의 데이터를 보호하기 위해 산업 표준 보안
                조치를 적용합니다. 여기에는 데이터 암호화, 접근 제어, 정기적인
                보안 감사 등이 포함됩니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">2. 보안 한계</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                어떠한 보안 시스템도 완벽할 수 없습니다. 모드온 AI는 무단 접근,
                사용, 변경 또는 파괴로부터 이용자 데이터를 보호하기 위해
                합리적인 조치를 취하지만, 이러한 보안 조치가 절대적인 보장을
                의미하지는 않습니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">3. 이용자 보안 책임</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                이용자는 자신의 계정 정보 및 인증코드를 안전하게 관리해야 합니다.
                계정 정보의 부적절한 관리로 인해 발생하는 손해에 대해 모드온 AI는
                책임을 지지 않습니다.
              </p>
            </article>
          </section>

          {/* 준거법 및 관할 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              준거법 및 관할
            </h2>

            <article className="mt-6">
              <h3 className="text-xl font-medium">1. 준거법</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                본 법적 고지 및 서비스 이용에 관한 모든 사항은 대한민국 법률의
                적용을 받습니다.
              </p>
            </article>

            <article className="mt-6">
              <h3 className="text-xl font-medium">2. 관할법원</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                본 웹사이트 또는 서비스 이용과 관련하여 발생하는 모든 분쟁은
                서울중앙지방법원을 전속적 관할법원으로 합니다.
              </p>
            </article>
          </section>

          {/* 법적 고지의 변경 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">
              법적 고지의 변경
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              모드온 AI는 필요한 경우 본 법적 고지를 언제든지 수정할 수 있습니다.
              변경 시에는 본 페이지에 수정일을 명시하여 게시합니다. 중요한 변경
              사항이 있는 경우 서비스 공지사항을 통해 별도로 안내할 수 있습니다.
              본 웹사이트를 계속 이용하시는 것은 변경된 법적 고지에 동의하시는
              것으로 간주됩니다.
            </p>
          </section>

          {/* 관련 정책 */}
          <section>
            <h2 className="text-2xl font-semibold border-b pb-2">관련 정책</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              서비스 이용에 관한 자세한 내용은 아래 정책을 참고해 주시기 바랍니다.
            </p>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="/terms"
                  className="text-primary hover:underline"
                >
                  이용약관
                </Link>
                <span className="text-muted-foreground">
                  {' '}
                  - 서비스 이용에 관한 권리와 의무
                </span>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-primary hover:underline"
                >
                  개인정보처리방침
                </Link>
                <span className="text-muted-foreground">
                  {' '}
                  - 개인정보의 수집, 이용, 보호에 관한 사항
                </span>
              </li>
            </ul>
          </section>

          {/* 문의처 */}
          <section className="mt-12 rounded-lg border bg-muted/30 p-6">
            <h3 className="text-lg font-medium">문의처</h3>
            <p className="mt-2 text-muted-foreground">
              본 법적 고지에 관한 문의 사항이 있으시면 아래 연락처로 문의해
              주시기 바랍니다.
            </p>
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
