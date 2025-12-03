import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { templateService } from '@/lib/services/template.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { slugify } from '@/lib/utils';
import { z } from 'zod';

const duplicateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
});

export const POST = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const { id } = await context!.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const validated = duplicateSchema.parse(body);

  // Generate slug from name if not provided
  const slug = validated.slug || slugify(validated.name || `copy-${Date.now()}`);

  const template = await templateService.duplicate(id, slug, validated.name);

  return NextResponse.json({
    success: true,
    data: template,
  }, { status: 201 });
});
