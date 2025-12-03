import { NextResponse } from 'next/server';
import { analyticsService } from '@/lib/services/analytics.service';

export async function GET() {
  try {
    const departments = await analyticsService.getDepartmentDistribution();

    return NextResponse.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error('Analytics departments error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '부서 분포 조회 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}
