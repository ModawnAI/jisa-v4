import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/services/analytics.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const trend = await analyticsService.getDocumentTrend(days);

    return NextResponse.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    console.error('Analytics document-trend error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '문서 추이 조회 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}
