import { NextRequest, NextResponse } from 'next/server';
import { seedPromptTemplates } from '@/lib/services/prompt-template.service';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/prompts/seed
 * Seed default prompt templates (admin only)
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다' } },
        { status: 401 }
      );
    }

    // Check if user is admin (optional - add your own role check)
    // For now, any authenticated user can seed (useful for initial setup)

    await seedPromptTemplates();

    return NextResponse.json({
      success: true,
      data: { message: '기본 프롬프트 템플릿이 생성되었습니다' },
    });
  } catch (error) {
    console.error('Error seeding templates:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SEED_ERROR', message: '시드 데이터 생성 실패' } },
      { status: 500 }
    );
  }
}
