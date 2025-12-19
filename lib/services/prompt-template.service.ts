import { db } from '@/lib/db';
import {
  promptTemplates,
  promptTemplateVersions,
  PromptTemplate,
  NewPromptTemplate,
  PromptTemplateVersion,
  ModelConfig,
  PROMPT_SLUGS,
} from '@/lib/db/schema/prompt-templates';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Service for managing prompt templates
 * Supports admin-editable prompts with version history and variable interpolation
 */
export class PromptTemplateService {
  /**
   * Get all active prompt templates
   */
  async listTemplates(filters?: {
    type?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<PromptTemplate[]> {
    const conditions = [];

    if (filters?.isActive !== undefined) {
      conditions.push(eq(promptTemplates.isActive, filters.isActive));
    }

    if (filters?.type) {
      conditions.push(eq(promptTemplates.type, filters.type as PromptTemplate['type']));
    }

    if (filters?.category) {
      conditions.push(eq(promptTemplates.category, filters.category as PromptTemplate['category']));
    }

    const query = conditions.length > 0
      ? db.select().from(promptTemplates).where(and(...conditions))
      : db.select().from(promptTemplates);

    return query.orderBy(desc(promptTemplates.updatedAt));
  }

  /**
   * Get a prompt template by ID
   */
  async getById(id: string): Promise<PromptTemplate | null> {
    const [template] = await db
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.id, id))
      .limit(1);

    return template || null;
  }

  /**
   * Get a prompt template by slug (returns latest active version)
   */
  async getBySlug(slug: string): Promise<PromptTemplate | null> {
    const [template] = await db
      .select()
      .from(promptTemplates)
      .where(and(
        eq(promptTemplates.slug, slug),
        eq(promptTemplates.isActive, true)
      ))
      .orderBy(desc(promptTemplates.version))
      .limit(1);

    return template || null;
  }

  /**
   * Get the default template for a given type
   */
  async getDefaultByType(type: PromptTemplate['type']): Promise<PromptTemplate | null> {
    const [template] = await db
      .select()
      .from(promptTemplates)
      .where(and(
        eq(promptTemplates.type, type),
        eq(promptTemplates.isDefault, true),
        eq(promptTemplates.isActive, true)
      ))
      .limit(1);

    return template || null;
  }

  /**
   * Create a new prompt template
   */
  async create(data: NewPromptTemplate, userId?: string): Promise<PromptTemplate> {
    const [template] = await db
      .insert(promptTemplates)
      .values({
        ...data,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    // Create initial version record
    await db.insert(promptTemplateVersions).values({
      templateId: template.id,
      version: 1,
      content: template.content,
      variables: template.variables,
      modelConfig: template.modelConfig,
      changeNote: 'Initial version',
      createdBy: userId,
    });

    return template;
  }

  /**
   * Update a prompt template (creates a new version)
   */
  async update(
    id: string,
    data: Partial<NewPromptTemplate>,
    userId?: string,
    changeNote?: string
  ): Promise<PromptTemplate> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Template not found');
    }

    const newVersion = existing.version + 1;

    // Update template
    const [updated] = await db
      .update(promptTemplates)
      .set({
        ...data,
        version: newVersion,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(promptTemplates.id, id))
      .returning();

    // Create version history record
    await db.insert(promptTemplateVersions).values({
      templateId: id,
      version: newVersion,
      content: updated.content,
      variables: updated.variables,
      modelConfig: updated.modelConfig,
      changeNote: changeNote || `Updated to version ${newVersion}`,
      createdBy: userId,
    });

    return updated;
  }

  /**
   * Set a template as the default for its type
   */
  async setAsDefault(id: string): Promise<void> {
    const template = await this.getById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    // Clear existing default for this type
    await db
      .update(promptTemplates)
      .set({ isDefault: false })
      .where(eq(promptTemplates.type, template.type));

    // Set new default
    await db
      .update(promptTemplates)
      .set({ isDefault: true })
      .where(eq(promptTemplates.id, id));
  }

  /**
   * Delete a prompt template (soft delete by deactivating)
   */
  async delete(id: string): Promise<void> {
    await db
      .update(promptTemplates)
      .set({ isActive: false })
      .where(eq(promptTemplates.id, id));
  }

  /**
   * Get version history for a template
   */
  async getVersionHistory(templateId: string): Promise<PromptTemplateVersion[]> {
    return db
      .select()
      .from(promptTemplateVersions)
      .where(eq(promptTemplateVersions.templateId, templateId))
      .orderBy(desc(promptTemplateVersions.version));
  }

  /**
   * Restore a previous version
   */
  async restoreVersion(templateId: string, versionNumber: number, userId?: string): Promise<PromptTemplate> {
    const [version] = await db
      .select()
      .from(promptTemplateVersions)
      .where(and(
        eq(promptTemplateVersions.templateId, templateId),
        eq(promptTemplateVersions.version, versionNumber)
      ))
      .limit(1);

    if (!version) {
      throw new Error('Version not found');
    }

    return this.update(
      templateId,
      {
        content: version.content,
        variables: version.variables || [],
        modelConfig: version.modelConfig || undefined,
      },
      userId,
      `Restored from version ${versionNumber}`
    );
  }

  /**
   * Interpolate variables in a prompt template
   * Supports {{variable_name}} syntax
   */
  interpolate(
    template: PromptTemplate,
    variables: Record<string, unknown>
  ): string {
    let content = template.content;

    // Get variable definitions
    const varDefs = template.variables || [];

    // Check required variables
    for (const varDef of varDefs) {
      if (varDef.required && !(varDef.name in variables)) {
        if (varDef.defaultValue !== undefined) {
          variables[varDef.name] = varDef.defaultValue;
        } else {
          throw new Error(`Required variable "${varDef.name}" is missing`);
        }
      }
    }

    // Replace all {{variable}} patterns
    content = content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      if (varName in variables) {
        const value = variables[varName];
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      }

      // Check for default value
      const varDef = varDefs.find(v => v.name === varName);
      if (varDef?.defaultValue !== undefined) {
        return varDef.defaultValue;
      }

      // Keep original if no replacement found
      return match;
    });

    return content;
  }

  /**
   * Build a complete prompt with context for Gemini API
   * This is the main entry point for RAG pipeline
   */
  async buildPrompt(
    slugOrType: string,
    variables: Record<string, unknown>,
    options?: {
      useDefault?: boolean;
      additionalContext?: string;
    }
  ): Promise<{
    prompt: string;
    modelConfig: ModelConfig;
    templateId: string;
  }> {
    let template: PromptTemplate | null = null;

    // Try to find by slug first
    template = await this.getBySlug(slugOrType);

    // If not found and useDefault is true, try to find default by type
    if (!template && options?.useDefault) {
      template = await this.getDefaultByType(slugOrType as PromptTemplate['type']);
    }

    if (!template) {
      throw new Error(`Prompt template not found: ${slugOrType}`);
    }

    let prompt = this.interpolate(template, variables);

    // Append additional context if provided
    if (options?.additionalContext) {
      prompt += `\n\n${options.additionalContext}`;
    }

    return {
      prompt,
      modelConfig: template.modelConfig || {
        model: 'gemini-3-flash-preview',
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
      templateId: template.id,
    };
  }
}

// Singleton instance
export const promptTemplateService = new PromptTemplateService();

/**
 * Default prompt templates to seed
 */
export const DEFAULT_PROMPT_TEMPLATES: NewPromptTemplate[] = [
  {
    name: '시스템 기본 프롬프트',
    slug: PROMPT_SLUGS.SYSTEM_DEFAULT,
    description: 'KakaoTalk 챗봇의 기본 시스템 프롬프트',
    type: 'system',
    category: 'kakao_chat',
    content: `당신은 한화생명 계약자를 위한 전문 AI 어시스턴트입니다.

역할:
- 보험 계약 및 수수료 관련 질문에 답변
- 회사 문서와 정책에 기반한 정확한 정보 제공
- 친절하고 전문적인 한국어 응대

제약사항:
- 제공된 컨텍스트에 없는 정보는 추측하지 않음
- 민감한 개인정보는 직접 언급하지 않음
- 불확실한 경우 담당자 연결 안내

사용자 정보:
- 이름: {{user_name}}
- 직급: {{user_position}}
- 권한 수준: {{clearance_level}}`,
    variables: [
      { name: 'user_name', description: '사용자 이름', required: false, type: 'string', defaultValue: '고객님' },
      { name: 'user_position', description: '사용자 직급', required: false, type: 'string', defaultValue: '' },
      { name: 'clearance_level', description: '권한 수준', required: false, type: 'string', defaultValue: 'basic' },
    ],
    modelConfig: { model: 'gemini-3-flash-preview', temperature: 0.3, maxOutputTokens: 2048 },
    isDefault: true,
    isActive: true,
  },
  {
    name: '쿼리 향상 프롬프트',
    slug: PROMPT_SLUGS.QUERY_ENHANCE_DEFAULT,
    description: 'Pinecone 검색을 위한 쿼리 최적화',
    type: 'query_enhancement',
    category: 'kakao_chat',
    content: `사용자의 질문을 Pinecone 벡터 검색에 최적화된 형태로 변환하세요.

원본 질문: {{user_query}}

변환 규칙:
1. 핵심 키워드 추출
2. 한화생명 관련 용어로 정규화
3. 동의어 및 관련어 추가
4. 불필요한 조사/접속어 제거

검색 컨텍스트:
- 문서 카테고리: {{document_categories}}
- 기간: {{time_period}}

최적화된 검색 쿼리만 출력하세요.`,
    variables: [
      { name: 'user_query', description: '사용자 원본 질문', required: true, type: 'string' },
      { name: 'document_categories', description: '검색할 문서 카테고리', required: false, type: 'array', defaultValue: '[]' },
      { name: 'time_period', description: '검색 기간', required: false, type: 'string', defaultValue: '' },
    ],
    modelConfig: { model: 'gemini-3-flash-preview', temperature: 0.1, maxOutputTokens: 256 },
    isDefault: true,
    isActive: true,
  },
  {
    name: '답변 생성 프롬프트',
    slug: PROMPT_SLUGS.ANSWER_DEFAULT,
    description: 'RAG 검색 결과 기반 최종 답변 생성',
    type: 'answer_generation',
    category: 'kakao_chat',
    content: `다음 컨텍스트를 기반으로 사용자 질문에 답변하세요.

사용자 질문: {{user_query}}

검색된 문서 컨텍스트:
{{context}}

답변 지침:
1. 컨텍스트에 있는 정보만 사용
2. 구체적인 수치와 날짜 포함 시 명확히 인용
3. 불확실한 부분은 솔직히 인정
4. 친절하고 전문적인 어조 유지
5. 필요시 추가 문의 경로 안내

답변:`,
    variables: [
      { name: 'user_query', description: '사용자 질문', required: true, type: 'string' },
      { name: 'context', description: 'RAG 검색 결과 컨텍스트', required: true, type: 'string' },
    ],
    modelConfig: { model: 'gemini-3-flash-preview', temperature: 0.7, maxOutputTokens: 1024 },
    isDefault: true,
    isActive: true,
  },
  {
    name: '수수료 질문 감지',
    slug: PROMPT_SLUGS.COMMISSION_DETECT,
    description: '수수료 관련 질문인지 판별',
    type: 'commission_detection',
    category: 'kakao_chat',
    content: `다음 질문이 수수료/커미션 관련 질문인지 판별하세요.

질문: {{user_query}}

판별 기준:
- 수수료, 커미션, 급여, 인센티브 관련 키워드
- 계약 실적, 성과, 목표 관련 내용
- 정산, 지급, 이체 관련 문의

응답 형식 (JSON):
{
  "is_commission_query": boolean,
  "confidence": number (0-1),
  "detected_keywords": string[],
  "suggested_category": string
}`,
    variables: [
      { name: 'user_query', description: '사용자 질문', required: true, type: 'string' },
    ],
    modelConfig: { model: 'gemini-3-flash-preview', temperature: 0.1, maxOutputTokens: 256 },
    isDefault: true,
    isActive: true,
  },
  {
    name: '인사말 프롬프트',
    slug: PROMPT_SLUGS.GREETING,
    description: '챗봇 인사말',
    type: 'greeting',
    category: 'kakao_chat',
    content: `안녕하세요, {{user_name}}님! 👋

한화생명 계약자 AI 어시스턴트입니다.
{{greeting_message}}

무엇을 도와드릴까요?
- 📋 수수료/커미션 조회
- 📊 실적 확인
- 📄 문서 검색
- ❓ 기타 문의

질문을 입력해 주세요!`,
    variables: [
      { name: 'user_name', description: '사용자 이름', required: false, type: 'string', defaultValue: '고객' },
      { name: 'greeting_message', description: '추가 인사 메시지', required: false, type: 'string', defaultValue: '' },
    ],
    modelConfig: { model: 'gemini-3-flash-preview', temperature: 0.5, maxOutputTokens: 256 },
    isDefault: true,
    isActive: true,
  },
  {
    name: '검색 결과 없음',
    slug: PROMPT_SLUGS.NO_RESULTS,
    description: '검색 결과가 없을 때 응답',
    type: 'no_results',
    category: 'kakao_chat',
    content: `죄송합니다, "{{user_query}}"에 대한 관련 문서를 찾지 못했습니다.

다음을 시도해 보세요:
1. 다른 키워드로 검색
2. 질문을 더 구체적으로 작성
3. 기간이나 카테고리 지정

{{additional_guidance}}

도움이 필요하시면 담당자에게 문의해 주세요.`,
    variables: [
      { name: 'user_query', description: '사용자 질문', required: true, type: 'string' },
      { name: 'additional_guidance', description: '추가 안내 메시지', required: false, type: 'string', defaultValue: '' },
    ],
    modelConfig: { model: 'gemini-3-flash-preview', temperature: 0.5, maxOutputTokens: 256 },
    isDefault: true,
    isActive: true,
  },
  {
    name: '오류 응답',
    slug: PROMPT_SLUGS.ERROR_GENERIC,
    description: '일반 오류 발생 시 응답',
    type: 'error_response',
    category: 'kakao_chat',
    content: `죄송합니다, 요청 처리 중 문제가 발생했습니다.

{{error_details}}

잠시 후 다시 시도해 주시거나, 문제가 지속되면 담당자에게 문의해 주세요.

오류 코드: {{error_code}}`,
    variables: [
      { name: 'error_details', description: '오류 상세 내용', required: false, type: 'string', defaultValue: '일시적인 오류가 발생했습니다.' },
      { name: 'error_code', description: '오류 코드', required: false, type: 'string', defaultValue: 'UNKNOWN' },
    ],
    modelConfig: { model: 'gemini-3-flash-preview', temperature: 0.3, maxOutputTokens: 256 },
    isDefault: true,
    isActive: true,
  },
];

/**
 * Seed default prompt templates
 */
export async function seedPromptTemplates(): Promise<void> {
  console.log('Seeding prompt templates...');

  for (const template of DEFAULT_PROMPT_TEMPLATES) {
    const existing = await promptTemplateService.getBySlug(template.slug);
    if (!existing) {
      await promptTemplateService.create(template);
      console.log(`Created template: ${template.name}`);
    } else {
      console.log(`Template already exists: ${template.name}`);
    }
  }

  console.log('Prompt templates seeding complete.');
}
