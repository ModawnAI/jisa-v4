import { NextRequest, NextResponse } from 'next/server';
import { promptTemplateService } from '@/lib/services/prompt-template.service';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/prompts/[id]/versions
 * Get version history for a prompt template
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const versions = await promptTemplateService.getVersionHistory(id);

    return NextResponse.json({
      success: true,
      data: versions,
    });
  } catch (error) {
    console.error('Error getting versions:', error);
    return NextResponse.json(
      { success: false, error: { code: 'GET_ERROR', message: '버전 기록 조회 실패' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prompts/[id]/versions
 * Restore a specific version
 */
export async function POST(request: NextRequest, context: RouteContext) {
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
    const { version } = body;

    if (!version) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '복원할 버전을 지정해주세요' } },
        { status: 400 }
      );
    }

    const template = await promptTemplateService.restoreVersion(id, version, user.id);

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error restoring version:', error);
    return NextResponse.json(
      { success: false, error: { code: 'RESTORE_ERROR', message: '버전 복원 실패' } },
      { status: 500 }
    );
  }
}
