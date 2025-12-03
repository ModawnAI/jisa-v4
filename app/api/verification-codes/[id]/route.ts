import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verificationCodeService } from '@/lib/services/verification-code.service';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/verification-codes/[id]
 * Get a single verification code by ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const code = await verificationCodeService.getById(id);

    if (!code) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '인증 코드를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: code });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/verification-codes/[id]
 * Revoke a verification code
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    if (body.action === 'revoke') {
      const code = await verificationCodeService.revoke(id);

      if (!code) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: '인증 코드를 찾을 수 없습니다.' } },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: code });
    }

    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: '유효하지 않은 요청입니다.' } },
      { status: 400 }
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/verification-codes/[id]
 * Delete a verification code permanently
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const code = await verificationCodeService.delete(id);

    if (!code) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '인증 코드를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
