import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function debug() {
  // Find scenes with qa_status but check if qa_last_assessment is there
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, qa_status, qa_attempts, qa_last_assessment')
    .not('qa_status', 'is', null)
    .limit(10);

  console.log('=== Scenes with qa_status ===');
  for (const s of scenes || []) {
    console.log(`\n${s.slug}:`);
    console.log(`  qa_status: ${s.qa_status}`);
    console.log(`  qa_attempts: ${s.qa_attempts}`);
    console.log(`  qa_last_assessment: ${s.qa_last_assessment ? 'EXISTS' : 'NULL'}`);
    if (s.qa_last_assessment) {
      const assessment = s.qa_last_assessment as Record<string, unknown>;
      console.log(`    essenceScore: ${assessment.essenceScore}`);
      console.log(`    APPROVED: ${assessment.APPROVED}`);
    }
  }

  // Check onboarding-extreme-give-hetero-f specifically (from user screenshot)
  const { data: extreme } = await supabase
    .from('scenes')
    .select('*')
    .eq('slug', 'onboarding-extreme-give-hetero-f')
    .single();

  console.log('\n=== onboarding-extreme-give-hetero-f ===');
  if (extreme) {
    console.log('qa_status:', extreme.qa_status);
    console.log('qa_attempts:', extreme.qa_attempts);
    console.log('qa_last_assessment:', extreme.qa_last_assessment ? JSON.stringify(extreme.qa_last_assessment, null, 2) : 'NULL');
  } else {
    console.log('NOT FOUND');
  }
}

debug();
