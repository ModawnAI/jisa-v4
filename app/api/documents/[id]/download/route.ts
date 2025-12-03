import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/lib/services/document.service';
import { withErrorHandler } from '@/lib/errors/handler';

export const GET = withErrorHandler(async (
  request: NextRequest,
  context
) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }

  const { id } = await context!.params;

  // Check if redirect mode requested
  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get('redirect') === 'true';

  if (redirect) {
    // Return signed URL for direct download
    const signedUrl = await documentService.getDownloadUrl(id);
    return NextResponse.redirect(signedUrl);
  }

  // Stream the file directly
  const { blob, fileName, mimeType } = await documentService.downloadFile(id);

  return new NextResponse(blob, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': blob.size.toString(),
    },
  });
});
