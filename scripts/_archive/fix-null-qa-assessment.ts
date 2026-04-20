import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fix() {
  // Find scenes with qa_status but null qa_last_assessment
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, qa_status, qa_attempts')
    .not('qa_status', 'is', null)
    .is('qa_last_assessment', null);

  console.log(`Found ${scenes?.length || 0} scenes with null qa_last_assessment`);

  for (const s of scenes || []) {
    console.log(`\nFixing ${s.slug}...`);

    // Create a fallback assessment explaining the issue
    const fallbackAssessment = {
      essenceCaptured: false,
      essenceScore: 0,
      essenceComment: `QA evaluation failed after ${s.qa_attempts} attempts. Claude Vision likely refused to analyze NSFW content.`,
      keyElementsCheck: [],
      participantsCorrect: false,
      technicalQuality: {
        score: 0,
        fatalFlaws: ['All QA evaluations failed - Claude Vision refused to analyze images'],
        minorIssues: [],
      },
      moodMatch: false,
      APPROVED: false,
      failReason: `All ${s.qa_attempts} QA evaluation attempts failed. Claude Vision likely refused to analyze NSFW content.`,
      regenerationHints: {
        emphasize: '',
        add: [],
        remove: [],
      },
    };

    await supabase
      .from('scenes')
      .update({ qa_last_assessment: fallbackAssessment })
      .eq('id', s.id);

    console.log(`  Fixed: ${s.slug}`);
  }

  console.log('\n=== DONE ===');
}

fix();
