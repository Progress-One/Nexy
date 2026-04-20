import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, is_active, elements, question')
    .ilike('slug', '%foot%');

  console.log('=== Foot scenes ===\n');

  for (const s of (scenes || []).sort((a, b) => a.slug.localeCompare(b.slug))) {
    const status = s.is_active ? '✅' : '❌';
    const hasElements = s.elements && s.elements.length > 0;
    const hasQuestion = s.question && (s.question.ru || s.question.en);

    console.log(`${status} ${s.slug}`);
    console.log(`   question: ${hasQuestion ? JSON.stringify(s.question) : 'none'}`);
    console.log(`   elements: ${hasElements ? s.elements.length : 0}`);

    if (hasElements) {
      for (const el of s.elements) {
        console.log(`     - ${el.id}: ${JSON.stringify(el.label)}`);
        if (el.follow_ups && el.follow_ups.length > 0) {
          for (const fu of el.follow_ups) {
            console.log(`       └─ ${fu.id} (${fu.type}): ${JSON.stringify(fu.question)}`);
          }
        }
      }
    }
    console.log('');
  }
}

run();
