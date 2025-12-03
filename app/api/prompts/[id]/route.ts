import { NextRequest, NextResponse } from 'next/server';
import { promptTemplateService } from '@/lib/services/prompt-template.service';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/prompts/[id]
 * Get a single prompt template
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const template = await promptTemplateService.getById(id);

    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '템플릿을 찾을 수 없습니다' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error getting template:', error);
    return NextResponse.json(
      { success: false, error: { code: 'GET_ERROR', message: '템플릿 조회 실패' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/prompts/[id]
 * Update a prompt template (creates new version)
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다' } },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { name, description, content, variables, modelConfig, isActive, changeNote } = body;

    const template = await promptTemplateService.update(
      id,
      {
        name,
        description,
        content,
        variables,
        modelConfig,
        isActive,
      },
      user.id,
      changeNote
    );

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_ERROR', message: '템플릿 수정 실패' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/prompts/[id]
 * Soft delete a prompt template
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다' } },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    await promptTemplateService.delete(id);

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DELETE_ERROR', message: '템플릿 삭제 실패' } },
      { status: 500 }
    );
  }
}
