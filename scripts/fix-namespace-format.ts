/**
 * Fix Namespace Format Script
 *
 * Fixes verification_codes and kakao_profiles tables that have
 * incorrectly formatted pinecone_namespace (using UUID instead of employee_code/sabon).
 *
 * Run: npx tsx scripts/fix-namespace-format.ts
 */

import { config } from 'dotenv';
import * as path from 'path';
config({ path: path.join(process.cwd(), '.env.local') });

import { db } from '../lib/db';
import { verificationCodes, employees } from '../lib/db/schema';
import { eq, isNotNull, sql } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  console.log('='.repeat(60));
  console.log('Namespace Format Fix Script');
  console.log('='.repeat(60));

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Check verification_codes with wrong namespace format
  console.log('\n1. Checking verification_codes...');

  const { data: wrongVCodes, error: vcError } = await supabase
    .from('verification_codes')
    .select(`
      id,
      code,
      employee_id,
      employee_code,
      pinecone_namespace
    `)
    .not('pinecone_namespace', 'is', null);

  if (vcError) {
    console.error('Error fetching verification_codes:', vcError);
    return;
  }

  console.log(`Found ${wrongVCodes?.length || 0} verification codes with namespaces`);

  // Find codes with UUID format (36 char after emp_)
  const uuidPattern = /^emp_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const wrongFormatVC = wrongVCodes?.filter(vc =>
    vc.pinecone_namespace && uuidPattern.test(vc.pinecone_namespace)
  ) || [];

  console.log(`Found ${wrongFormatVC.length} verification codes with UUID namespace format`);

  for (const vc of wrongFormatVC) {
    console.log(`\n  Code: ${vc.code}`);
    console.log(`  Current namespace: ${vc.pinecone_namespace}`);
    console.log(`  Employee code: ${vc.employee_code}`);

    if (vc.employee_code) {
      const correctNamespace = `emp_${vc.employee_code}`;
      console.log(`  Correct namespace: ${correctNamespace}`);

      // Fix the verification code
      const { error: updateError } = await supabase
        .from('verification_codes')
        .update({ pinecone_namespace: correctNamespace })
        .eq('id', vc.id);

      if (updateError) {
        console.log(`  ERROR updating: ${updateError.message}`);
      } else {
        console.log(`  FIXED!`);
      }
    } else {
      console.log(`  SKIPPED: No employee_code available`);
    }
  }

  // 2. Check kakao_profiles with wrong namespace format
  console.log('\n2. Checking kakao_profiles...');

  const { data: wrongProfiles, error: profileError } = await supabase
    .from('kakao_profiles')
    .select(`
      id,
      kakao_user_id,
      display_name,
      employee_sabon,
      pinecone_namespace,
      rag_enabled
    `)
    .not('pinecone_namespace', 'is', null);

  if (profileError) {
    console.error('Error fetching kakao_profiles:', profileError);
    return;
  }

  console.log(`Found ${wrongProfiles?.length || 0} kakao_profiles with namespaces`);

  const wrongFormatProfiles = wrongProfiles?.filter(p =>
    p.pinecone_namespace && uuidPattern.test(p.pinecone_namespace)
  ) || [];

  console.log(`Found ${wrongFormatProfiles.length} kakao_profiles with UUID namespace format`);

  for (const profile of wrongFormatProfiles) {
    console.log(`\n  User: ${profile.display_name} (${profile.kakao_user_id})`);
    console.log(`  Current namespace: ${profile.pinecone_namespace}`);
    console.log(`  Employee sabon: ${profile.employee_sabon}`);

    if (profile.employee_sabon) {
      const correctNamespace = `emp_${profile.employee_sabon}`;
      console.log(`  Correct namespace: ${correctNamespace}`);

      // Fix the profile
      const { error: updateError } = await supabase
        .from('kakao_profiles')
        .update({ pinecone_namespace: correctNamespace })
        .eq('id', profile.id);

      if (updateError) {
        console.log(`  ERROR updating: ${updateError.message}`);
      } else {
        console.log(`  FIXED!`);
      }
    } else {
      console.log(`  SKIPPED: No employee_sabon available`);
    }
  }

  // 3. Summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));

  // Re-fetch to show final state
  const { data: finalVC } = await supabase
    .from('verification_codes')
    .select('pinecone_namespace')
    .not('pinecone_namespace', 'is', null);

  const { data: finalProfiles } = await supabase
    .from('kakao_profiles')
    .select('pinecone_namespace')
    .not('pinecone_namespace', 'is', null);

  const stillWrongVC = finalVC?.filter(vc =>
    vc.pinecone_namespace && uuidPattern.test(vc.pinecone_namespace)
  ).length || 0;

  const stillWrongProfiles = finalProfiles?.filter(p =>
    p.pinecone_namespace && uuidPattern.test(p.pinecone_namespace)
  ).length || 0;

  console.log(`verification_codes remaining with UUID format: ${stillWrongVC}`);
  console.log(`kakao_profiles remaining with UUID format: ${stillWrongProfiles}`);

  if (stillWrongVC === 0 && stillWrongProfiles === 0) {
    console.log('\nAll namespaces are now in correct format (emp_{sabon})!');
  } else {
    console.log('\nSome records still have issues (missing employee_sabon).');
  }

  console.log('\nDone!');
}

main().catch(console.error);
