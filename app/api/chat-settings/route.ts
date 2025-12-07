import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getChatSettings, updateChatSettings } from '@/lib/services/chat-settings.service';
import { previewFormat } from '@/lib/utils/response-formatter';

/**
 * GET /api/chat-settings
 * Get current chat settings
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const settings = await getChatSettings();

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('[ChatSettings API] GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '설정을 불러오는 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chat-settings
 * Update chat settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate max_line_width
    if (body.maxLineWidth !== undefined) {
      const width = Number(body.maxLineWidth);
      if (isNaN(width) || width < 10 || width > 50) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: '줄 너비는 10-50 사이여야 합니다.' } },
          { status: 400 }
        );
      }
      body.maxLineWidth = width;
    }

    const updated = await updateChatSettings(body, user.id);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('[ChatSettings API] PATCH error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '설정을 저장하는 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat-settings/preview
 * Preview formatted text
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const { text, maxWidth } = await request.json();

    if (!text) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '미리보기할 텍스트가 필요합니다.' } },
        { status: 400 }
      );
    }

    const preview = previewFormat(text, maxWidth || 22);

    return NextResponse.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    console.error('[ChatSettings API] POST preview error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '미리보기 생성 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
