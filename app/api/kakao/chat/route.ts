/**
 * KakaoTalk Chat Webhook Handler
 * POST /api/kakao/chat
 *
 * Architecture:
 * 1. Public KakaoTalk channel (anyone can add)
 * 2. First message MUST be verification code
 * 3. Code determines access level (role + tier)
 * 4. All subsequent queries filtered by RBAC
 * 5. All interactions logged to Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTextFromGPT } from '@/lib/services/kakao/chat.service';
import type {
  KakaoWebhookRequest,
  KakaoResponse,
  KakaoCallbackResponse,
} from '@/lib/types/kakao';

/**
 * Role and tier name mappings for Korean display
 */
const tierNames: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const roleNames: Record<string, string> = {
  user: '사용자',
  junior: '주니어',
  senior: '시니어',
  manager: '매니저',
  admin: '관리자',
  ceo: 'CEO',
};

/**
 * Create KakaoTalk response format
 */
function createKakaoResponse(
  text: string,
  quickReplies?: Array<{ action: string; label: string; messageText: string }>
): KakaoResponse {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }],
      quickReplies: quickReplies || [],
    },
  };
}

/**
 * Main KakaoTalk webhook handler
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  console.log('='.repeat(80));
  console.log('KAKAOTALK WEBHOOK RECEIVED');
  console.log('Time:', new Date().toISOString());
  console.log('='.repeat(80));

  try {
    const supabase = createAdminClient();
    const data: KakaoWebhookRequest = await request.json();

    console.log('RAW REQUEST BODY:');
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(80));

    // Extract KakaoTalk user information (Official v2.0 format)
    const kakaoUserId = data.userRequest.user.id;
    const kakaoNickname = data.userRequest.user.properties?.nickname || '사용자';
    const userMessage = data.userRequest.utterance?.trim() || '';
    const callbackUrl = data.userRequest.callbackUrl;

    console.log('USER INFO:');
    console.log(`   Kakao ID: ${kakaoUserId}`);
    console.log(`   Nickname: ${kakaoNickname}`);
    console.log(`   Message: "${userMessage}"`);
    console.log(`   Callback URL: ${callbackUrl || 'none'}`);
    console.log('='.repeat(80));

    // =====================================================
    // COMMAND HANDLING: /delete
    // =====================================================
    if (userMessage.toLowerCase() === '/delete' || userMessage.toLowerCase() === '/삭제') {
      console.log('[KakaoTalk] Delete command detected - removing user profile');

      // Find and delete the user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('kakao_user_id', kakaoUserId)
        .single();

      if (profile) {
        // Delete the auth user first (this will cascade delete the profile via trigger)
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(profile.id);

        if (authDeleteError) {
          console.error('[KakaoTalk] Failed to delete auth user:', authDeleteError);
        } else {
          console.log(`[KakaoTalk] Successfully deleted auth user: ${profile.id}`);
        }

        // Delete the profile (in case trigger didn't work)
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', profile.id);

        if (deleteError) {
          console.error('[KakaoTalk] Failed to delete profile:', deleteError);
        }

        console.log(`[KakaoTalk] Successfully deleted profile and auth user: ${profile.id}`);

        // Log the deletion event
        await supabase.from('analytics_events').insert({
          event_type: 'user.deleted',
          kakao_user_id: kakaoUserId,
          user_id: profile.id,
          metadata: {
            full_name: profile.full_name,
            email: profile.email,
            deleted_at: new Date().toISOString(),
          },
        });

        return NextResponse.json(
          createKakaoResponse(
            '계정이 성공적으로 삭제되었습니다!\n\n새로운 인증 코드로 다시 가입할 수 있습니다.\n\n코드를 입력하여 시작하세요.'
          )
        );
      } else {
        // No profile found
        return NextResponse.json(
          createKakaoResponse('등록된 계정이 없습니다.\n\n인증 코드를 입력하여 가입하세요.')
        );
      }
    }

    // =====================================================
    // STEP 1: Check if user has profile (gated access)
    // =====================================================

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('kakao_user_id', kakaoUserId)
      .single();

    console.log('PROFILE LOOKUP:');
    console.log('   Profile found:', !!profile);
    console.log('   Profile ID:', profile?.id);
    console.log('   Profile role:', profile?.role);
    console.log('   Profile tier:', profile?.subscription_tier);
    console.log('='.repeat(80));

    // =====================================================
    // STEP 2: No profile = First-time user -> Verify code
    // =====================================================

    if (!profile || profileError) {
      console.log(`[KakaoTalk] First-time user: ${kakaoUserId}`);

      // Check if message contains verification code pattern
      // Supports both formats:
      // - Admin codes: ABC-DEF-GHI-JKL (4 segments of 3 chars)
      // - Employee codes: EMP-00124-673 (EMP + 5 digits + 3 chars)
      const codePattern = /([A-Z]{3,4}-[A-Z0-9]{3,5}-[A-Z0-9]{3,5}(?:-[A-Z0-9]{3,5})?)/;
      const codeMatch = userMessage.toUpperCase().match(codePattern);

      // No code in message - request code
      if (!codeMatch) {
        console.log('[KakaoTalk] No code found - requesting verification');
        return NextResponse.json(
          createKakaoResponse(`안녕하세요! JISA 챗봇입니다.

처음 사용하시는 분은 관리자로부터 받은 인증 코드를 입력해주세요.

코드 형식 예시:
• 직원 코드: EMP-00124-673
• 관리자 코드: HXK-9F2-M7Q-3WP

인증 코드가 없으신가요?
관리자에게 문의하여 코드를 받으세요.`)
        );
      }

      // Found code - verify it
      const code = codeMatch[1].toUpperCase();
      console.log(`[KakaoTalk] Verification code detected: ${code}`);

      const { data: verificationCode, error: codeError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('code', code)
        .single();

      console.log('CODE VERIFICATION DEBUG:');
      console.log('   Code Error:', codeError);
      console.log('   Verification Code:', JSON.stringify(verificationCode, null, 2));
      console.log('='.repeat(80));

      // Invalid code
      if (codeError || !verificationCode) {
        console.log(`[KakaoTalk] Invalid code: ${code}`);
        return NextResponse.json(
          createKakaoResponse(`유효하지 않은 인증 코드입니다.

코드: ${code}

관리자에게 정확한 코드를 확인해주세요.`)
        );
      }

      // Check code status
      if (verificationCode.status !== 'active') {
        console.log(`[KakaoTalk] Code not active: ${code}, status: ${verificationCode.status}`);
        return NextResponse.json(
          createKakaoResponse(`이 코드는 더 이상 사용할 수 없습니다.

상태: ${verificationCode.status === 'used' ? '이미 사용됨' : verificationCode.status === 'expired' ? '만료됨' : '비활성화'}

관리자에게 새로운 코드를 요청해주세요.`)
        );
      }

      // Check max uses
      if (verificationCode.current_uses >= verificationCode.max_uses) {
        console.log(`[KakaoTalk] Code max uses reached: ${code}`);
        return NextResponse.json(
          createKakaoResponse(`이 코드는 이미 ${verificationCode.max_uses}회 사용되었습니다.

관리자에게 새로운 코드를 요청해주세요.`)
        );
      }

      // Check expiration
      if (verificationCode.expires_at && new Date(verificationCode.expires_at) < new Date()) {
        console.log(`[KakaoTalk] Code expired: ${code}`);
        return NextResponse.json(
          createKakaoResponse(`이 코드는 만료되었습니다.

만료일: ${new Date(verificationCode.expires_at).toLocaleDateString('ko-KR')}

관리자에게 새로운 코드를 요청해주세요.`)
        );
      }

      // =====================================================
      // STEP 3: Valid code -> Create profile
      // =====================================================

      console.log(`[KakaoTalk] Creating profile with role=${verificationCode.role}, tier=${verificationCode.tier}`);

      // Create auth user first (KakaoTalk users don't have email/password)
      const dummyEmail = `kakao_${kakaoUserId.substring(0, 8)}@kakao.internal`;
      const dummyPassword = randomUUID();

      console.log(`[KakaoTalk] Checking for existing user with email: ${dummyEmail}`);

      // Check if user already exists by kakao_user_id OR email
      let authUserId: string;

      // First try kakao_user_id
      let { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('kakao_user_id', kakaoUserId)
        .single();

      // If not found, try by email (from previous failed attempts)
      if (!existingProfile) {
        const profileByEmail = await supabase
          .from('profiles')
          .select('id')
          .eq('email', dummyEmail)
          .single();

        existingProfile = profileByEmail.data;
      }

      if (existingProfile) {
        console.log(`[KakaoTalk] User already exists, using existing profile: ${existingProfile.id}`);
        authUserId = existingProfile.id;
      } else {
        // Check if auth user exists by email (from previous failed attempts)
        console.log(`[KakaoTalk] Checking for existing auth user with email: ${dummyEmail}`);
        const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
        const existingAuthUser = existingAuthUsers?.users?.find(
          (u: { email?: string }) => u.email === dummyEmail
        );

        if (existingAuthUser) {
          console.log(`[KakaoTalk] Found existing auth user without profile, deleting: ${existingAuthUser.id}`);
          const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(existingAuthUser.id);

          if (deleteAuthError) {
            console.error('[KakaoTalk] Failed to delete existing auth user:', deleteAuthError);
          } else {
            console.log(`[KakaoTalk] Successfully deleted orphaned auth user: ${existingAuthUser.id}`);
          }
        }

        // Create new auth user
        console.log(`[KakaoTalk] Creating new auth user with email: ${dummyEmail}`);

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: dummyEmail,
          password: dummyPassword,
          email_confirm: true,
          user_metadata: {
            kakao_user_id: kakaoUserId,
            kakao_nickname: kakaoNickname,
            full_name: kakaoNickname,
          },
        });

        if (authError || !authUser.user) {
          console.error('[KakaoTalk] Auth user creation failed:', authError);
          return NextResponse.json(
            createKakaoResponse(`인증 처리 중 오류가 발생했습니다.

잠시 후 다시 시도해주세요.
문제가 지속되면 관리자에게 문의하세요.`)
          );
        }

        console.log(`[KakaoTalk] Auth user created: ${authUser.user.id}`);
        authUserId = authUser.user.id;
      }

      // Profile is auto-created by trigger, so update it with KakaoTalk info
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .update({
          kakao_user_id: kakaoUserId,
          kakao_nickname: kakaoNickname,
          full_name: kakaoNickname,
          role: verificationCode.role,
          subscription_tier: verificationCode.tier,
          query_count: 0,
          permissions: [],
          // Employee RAG fields
          pinecone_namespace: verificationCode.pinecone_namespace || null,
          rag_enabled: !!verificationCode.pinecone_namespace,
          credential_id: verificationCode.intended_recipient_id || null,
          metadata: {
            verification_code: code,
            verified_at: new Date().toISOString(),
            code_purpose: (verificationCode as Record<string, unknown>).purpose,
            code_metadata: verificationCode.metadata,
            employee_sabon: verificationCode.employee_sabon || null,
          },
          verified_with_code: code,
          first_chat_at: new Date().toISOString(),
          last_chat_at: new Date().toISOString(),
        })
        .eq('id', authUserId)
        .select()
        .single();

      if (createError || !newProfile) {
        console.error('[KakaoTalk] Profile creation failed:', createError);
        return NextResponse.json(
          createKakaoResponse(`인증 처리 중 오류가 발생했습니다.

잠시 후 다시 시도해주세요.
문제가 지속되면 관리자에게 문의하세요.`)
        );
      }

      // Update verification code usage
      const usedBy = verificationCode.used_by || [];
      const newUsedBy = [...usedBy, kakaoUserId];
      const newUseCount = verificationCode.current_uses + 1;

      await supabase
        .from('verification_codes')
        .update({
          current_uses: newUseCount,
          status: newUseCount >= verificationCode.max_uses ? 'used' : 'active',
          used_at: new Date().toISOString(),
          used_by: newUsedBy,
        })
        .eq('code', code);

      // Log verification event
      await supabase.from('analytics_events').insert({
        event_type: 'user.verified',
        kakao_user_id: kakaoUserId,
        user_id: newProfile.id,
        metadata: {
          verification_code: code,
          role: verificationCode.role,
          tier: verificationCode.tier,
          nickname: kakaoNickname,
        },
      });

      // Get recipient name and email from verification code
      const recipientName = verificationCode.intended_recipient_name || newProfile.full_name || kakaoNickname;
      const recipientEmail = verificationCode.intended_recipient_email || newProfile.email || dummyEmail;

      // Customize message for employees vs admins
      const isEmployee = !!verificationCode.pinecone_namespace && !!verificationCode.employee_sabon;

      const welcomeText = isEmployee
        ? `인증 완료!

이름: ${recipientName}
이메일: ${recipientEmail}
역할: ${roleNames[verificationCode.role] || verificationCode.role}
등급: ${tierNames[verificationCode.tier] || verificationCode.tier}

이제 JISA에게 질문하실 수 있습니다.

예시 질문:
• 일반 질문: "11월 교육 일정 알려줘"
• 내 급여 정보: "/ 보험계약 건별 수수료 알려줘"
• 내 계약 정보: "/ 메리츠화재 계약 현황"

본인 급여 정보 조회는 반드시 "/" 로 시작하세요!`
        : `인증 완료!

이름: ${recipientName}
이메일: ${recipientEmail}
역할: ${roleNames[verificationCode.role] || verificationCode.role}
등급: ${tierNames[verificationCode.tier] || verificationCode.tier}

이제 JISA에게 질문하실 수 있습니다.

예시 질문:
• "11월 교육 일정 알려줘"
• "한화생명 종신보험 수수료"
• "이번 주 KRS 시험 일정"`;

      const quickReplies = isEmployee
        ? [
            { action: 'message', label: '내 급여 정보', messageText: '/ 내 최종지급액 알려줘' },
            { action: 'message', label: '내 계약 현황', messageText: '/ 보험계약 건별 수수료' },
            { action: 'message', label: '일반 정보', messageText: '11월 교육 일정' },
          ]
        : [
            { action: 'message', label: '11월 일정', messageText: '11월 교육 일정 알려줘' },
            { action: 'message', label: '수수료 조회', messageText: '한화생명 종신보험 수수료' },
            { action: 'message', label: 'KRS 일정', messageText: 'KRS 시험 일정' },
          ];

      console.log(`[KakaoTalk] User verified: ${kakaoUserId} as ${verificationCode.role}/${verificationCode.tier}`);

      return NextResponse.json(createKakaoResponse(welcomeText, quickReplies));
    }

    // =====================================================
    // STEP 4: User has profile -> Process with RBAC
    // =====================================================

    console.log(`[KakaoTalk] Verified user: ${kakaoUserId}, role=${profile.role}, tier=${profile.subscription_tier}`);

    // =====================================================
    // CALLBACK HANDLING (IMMEDIATE RESPONSE)
    // =====================================================
    if (callbackUrl) {
      console.log('[KakaoTalk] CallbackURL detected - returning immediate response and processing in background');

      // Update last chat timestamp in background (don't block response!)
      supabase
        .from('profiles')
        .update({ last_chat_at: new Date().toISOString() })
        .eq('id', profile.id)
        .then(() => console.log('[KakaoTalk] Last chat timestamp updated'));

      // Start background processing (don't await!)
      getTextFromGPT(userMessage, profile.id)
        .then(async (finalResponse) => {
          console.log('[KakaoTalk] Background processing complete, sending to callback URL');

          // Send response to callback URL
          const callbackResponse = await fetch(callbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              version: '2.0',
              template: {
                outputs: [{ simpleText: { text: finalResponse } }],
              },
            }),
          });

          if (!callbackResponse.ok) {
            console.error('[KakaoTalk] Callback failed:', await callbackResponse.text());
          } else {
            console.log('[KakaoTalk] Callback successful');
          }

          // Log the final response
          await supabase.from('query_logs').insert({
            user_id: profile.id,
            kakao_user_id: kakaoUserId,
            query_text: userMessage,
            response_text: finalResponse,
            query_type: finalResponse.includes('수수료') || finalResponse.includes('%') ? 'commission' : 'rag',
            response_time_ms: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            metadata: {
              kakao_nickname: kakaoNickname,
              role: profile.role,
              tier: profile.subscription_tier,
              via_callback: true,
            },
          });
        })
        .catch((bgError) => {
          console.error('[KakaoTalk] Background processing error:', bgError);
        });

      // Return IMMEDIATE response with useCallback (< 100ms)
      console.log('[KakaoTalk] Returning immediate useCallback response');
      const callbackResp: KakaoCallbackResponse = {
        version: '2.0',
        useCallback: true,
        data: {
          text: '질문에 대한 답변을 준비 중입니다. 잠시만 기다려주세요...',
        },
      };
      return NextResponse.json(callbackResp);
    }

    // =====================================================
    // NO CALLBACK - SYNCHRONOUS PROCESSING WITH TIMEOUT
    // =====================================================
    console.log('[KakaoTalk] No callbackUrl - processing synchronously with timeout');

    // Update last chat timestamp in background (don't block response!)
    supabase
      .from('profiles')
      .update({ last_chat_at: new Date().toISOString() })
      .eq('id', profile.id)
      .then(() => console.log('[KakaoTalk] Last chat timestamp updated'));

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 4500)
    );

    let response: string;

    try {
      // Process query with RBAC (uses profile.id to get role/tier)
      response = await Promise.race([getTextFromGPT(userMessage, profile.id), timeoutPromise]);
    } catch {
      // Timeout - return error message
      console.log('[KakaoTalk] Query timeout (no callback available)');

      return NextResponse.json(
        createKakaoResponse('처리 시간이 초과되었습니다.\n\n더 간단한 질문으로 다시 시도해주세요.')
      );
    }

    const responseTime = Date.now() - startTime;

    // =====================================================
    // STEP 5: Log query to Supabase (non-blocking)
    // =====================================================

    supabase
      .from('query_logs')
      .insert({
        user_id: profile.id,
        kakao_user_id: kakaoUserId,
        query_text: userMessage,
        response_text: response,
        query_type: response.includes('수수료') || response.includes('%') ? 'commission' : 'rag',
        response_time_ms: responseTime,
        timestamp: new Date().toISOString(),
        metadata: {
          kakao_nickname: kakaoNickname,
          role: profile.role,
          tier: profile.subscription_tier,
        },
      })
      .then((result) => {
        if (result.error) {
          console.error('[KakaoTalk] Logging error:', result.error);
        } else {
          console.log(`[KakaoTalk] Query logged for ${kakaoUserId}`);
        }
      });

    // Log analytics event (non-blocking)
    supabase
      .from('analytics_events')
      .insert({
        event_type: 'query.completed',
        user_id: profile.id,
        kakao_user_id: kakaoUserId,
        metadata: {
          query_type: response.includes('수수료') ? 'commission' : 'rag',
          response_time: responseTime,
          success: true,
        },
      })
      .then((result) => {
        if (result.error) {
          console.error('[KakaoTalk] Analytics error:', result.error);
        }
      });

    console.log('='.repeat(80));
    console.log('RESPONSE SENT');
    console.log(`Response Time: ${responseTime}ms`);
    console.log(`Response Length: ${response.length} chars`);
    console.log(`User: ${kakaoUserId}`);
    console.log('='.repeat(80));

    // =====================================================
    // STEP 6: Return response to KakaoTalk
    // =====================================================

    return NextResponse.json(createKakaoResponse(response));
  } catch (error) {
    console.error('='.repeat(80));
    console.error('KAKAOTALK ERROR');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('='.repeat(80));

    // Return error response (KakaoTalk expects 200 even for errors)
    return NextResponse.json(
      createKakaoResponse(`오류가 발생했습니다.

잠시 후 다시 시도해주세요.
문제가 지속되면 관리자에게 문의하세요.

E: info@modawn.ai`),
      { status: 200 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
