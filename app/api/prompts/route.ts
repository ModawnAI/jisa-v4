import { NextRequest, NextResponse } from 'next/server';
import { promptTemplateService } from '@/lib/services/prompt-template.service';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/prompts
 * List all prompt templates with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || undefined;
    const category = searchParams.get('category') || undefined;
    const isActive = searchParams.get('isActive');

    const templates = await promptTemplateService.listTemplates({
      type,
      category,
      isActive: isActive !== null ? isActive === 'true' : undefined,
    });

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Error listing templates:', error);
    return NextResponse.json(
      { success: false, error: { code: 'LIST_ERROR', message: '템플릿 목록 조회 실패' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prompts
 * Create a new prompt template
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, slug, description, type, category, content, variables, modelConfig, isDefault } = body;

    if (!name || !slug || !type || !content) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '필수 필드가 누락되었습니다' } },
        { status: 400 }
      );
    }

    const template = await promptTemplateService.create(
      {
        name,
        slug,
        description,
        type,
        category: category || 'kakao_chat',
        content,
        variables: variables || [],
        modelConfig: modelConfig || { model: 'gemini-2.0-flash', temperature: 0.7, maxOutputTokens: 1024 },
        isDefault: isDefault || false,
        isActive: true,
      },
      user.id
    );

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { success: false, error: { code: 'CREATE_ERROR', message: '템플릿 생성 실패' } },
      { status: 500 }
    );
  }
}
