import { NextResponse } from 'next/server';
import { analyticsService } from '@/lib/services/analytics.service';

export async function GET() {
  try {
    const breakdown = await analyticsService.getStatusBreakdown();

    return NextResponse.json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    console.error('Analytics status-breakdown error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '상태 분포 조회 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}
