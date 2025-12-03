import { NextResponse } from 'next/server';
import { analyticsService } from '@/lib/services/analytics.service';

export async function GET() {
  try {
    const stats = await analyticsService.getDashboardStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '통계 조회 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}
