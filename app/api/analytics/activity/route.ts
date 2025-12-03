import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/services/analytics.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const activity = await analyticsService.getRecentActivity(limit);

    return NextResponse.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error('Analytics activity error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '활동 조회 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}
