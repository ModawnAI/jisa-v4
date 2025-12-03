import { NextResponse } from 'next/server';
import { lineageService } from '@/lib/services/lineage.service';

export async function GET() {
  try {
    const statistics = await lineageService.getStatistics();

    return NextResponse.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Lineage statistics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '계보 통계 조회 중 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}
