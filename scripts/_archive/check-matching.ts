import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get a few give/receive paired scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, question, ai_context')
    .or('slug.ilike.%give,slug.ilike.%receive')
    .eq('is_active', true)
    .limit(10);

  console.log('Checking targetDimensions for give/receive scenes:\n');
  
  for (const s of scenes || []) {
    const question = s.question as any;
    const aiContext = s.ai_context as any;
    
    const targetDims = question?.targetDimensions || aiContext?.targetDimensions || [];
    
    console.log(s.slug);
    console.log('  targetDimensions:', JSON.stringify(targetDims));
    console.log('');
  }
}

run();
