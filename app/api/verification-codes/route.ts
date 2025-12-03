import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verificationCodeService } from '@/lib/services/verification-code.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const createCodeSchema = z.object({
  employeeId: z.string().uuid('유효한 직원 ID가 아닙니다'),
  role: z.enum(['ceo', 'admin', 'manager', 'senior', 'junior', 'user']).optional(),
  tier: z.enum(['enterprise', 'pro', 'basic', 'free']).optional(),
  maxUses: z.number().int().min(1).max(100).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
  description: z.string().max(500).optional(),
});

const bulkCreateSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1).max(100),
  role: z.enum(['ceo', 'admin', 'manager', 'senior', 'junior', 'user']).optional(),
  tier: z.enum(['enterprise', 'pro', 'basic', 'free']).optional(),
  maxUses: z.number().int().min(1).max(100).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

/**
 * GET /api/verification-codes
 * List all verification codes with filtering and pagination
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);

  // Check for stats request
  if (searchParams.get('stats') === 'true') {
    const stats = await verificationCodeService.getStats();
    return NextResponse.json({ success: true, data: stats });
  }

  const filters = {
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') as 'active' | 'used' | 'expired' | 'revoked' | undefined,
    employeeId: searchParams.get('employeeId') || undefined,
  };

  const pagination = {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
  };

  const result = await verificationCodeService.list(filters, pagination);

  return NextResponse.json({
    success: true,
    ...result,
  });
});

/**
 * POST /api/verification-codes
 * Create a new verification code or bulk create
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const body = await request.json();

  // Check if bulk create
  if (body.employeeIds && Array.isArray(body.employeeIds)) {
    const validated = bulkCreateSchema.parse(body);
    const results = await verificationCodeService.bulkCreate(validated.employeeIds, {
      role: validated.role,
      tier: validated.tier,
      maxUses: validated.maxUses,
      expiresInDays: validated.expiresInDays,
      createdBy: user.id,
    });

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json(
      {
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            success: successCount,
            failed: failCount,
          },
        },
      },
      { status: 201 }
    );
  }

  // Single create
  const validated = createCodeSchema.parse(body);

  const code = await verificationCodeService.create({
    ...validated,
    createdBy: user.id,
  });

  return NextResponse.json(
    { success: true, data: code },
    { status: 201 }
  );
});
