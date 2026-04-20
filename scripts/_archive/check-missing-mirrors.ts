import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  // Check what we have for these topics in onboarding
  const topics = ['extreme', 'romantic', 'toys', 'lingerie'];

  for (const topic of topics) {
    console.log(`\n## ${topic.toUpperCase()}`);

    const { data } = await supabase
      .from('scenes')
      .select('slug, role_direction, user_description, is_active')
      .eq('category', 'onboarding')
      .ilike('slug', `%${topic}%`)
      .order('slug');

    data?.forEach(s => {
      const status = s.is_active === false ? ' [INACTIVE]' : '';
      console.log(`  ${s.slug}${status}`);
      console.log(`    role: ${s.role_direction}`);
      console.log(`    desc: ${s.user_description?.ru?.substring(0, 50)}...`);
    });
  }

  console.log('\n\n## SUMMARY');
  console.log('Current onboarding has:');
  console.log('- extreme: M→F only (он контролирует её)');
  console.log('- romantic: M→F only (он раздевает её)');
  console.log('- toys: M→F only (он использует на ней)');
  console.log('- lingerie: F shows to M (она в белье)');
  console.log('\nMissing F→M mirrors:');
  console.log('- extreme: F→M (она контролирует его)');
  console.log('- romantic: F→M (она раздевает его)');
  console.log('- toys: F→M (она использует на нём)');
  console.log('- lingerie: M shows to F (он в белье) - already exists as gay variant');
}

check();
