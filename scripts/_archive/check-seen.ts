import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get all scene_responses
  const { data: responses, count } = await supabase
    .from('scene_responses')
    .select('user_id, scene_id, question_type', { count: 'exact' })
    .limit(100);

  console.log('Total responses in DB:', count);

  if (!responses || responses.length === 0) {
    console.log('No responses found');
    return;
  }

  // Group by user
  const byUser: Record<string, typeof responses> = {};
  for (const r of responses) {
    if (!byUser[r.user_id]) byUser[r.user_id] = [];
    byUser[r.user_id].push(r);
  }

  console.log('Users with responses:', Object.keys(byUser).length);

  for (const [userId, userResponses] of Object.entries(byUser)) {
    console.log('\n=== User:', userId.substring(0, 8), '... ===');
    console.log('Responses:', userResponses.length);

    // Count by question_type
    const types: Record<string, number> = {};
    for (const r of userResponses) {
      types[r.question_type || 'unknown'] = (types[r.question_type || 'unknown'] || 0) + 1;
    }
    console.log('By type:', types);
  }
}
run();
