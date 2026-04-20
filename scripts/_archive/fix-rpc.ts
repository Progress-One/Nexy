import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Check if excluded_preferences table exists
  const { data: tables, error: tablesError } = await supabase
    .from('excluded_preferences')
    .select('id')
    .limit(1);

  if (tablesError) {
    console.log('excluded_preferences table error:', tablesError.message);
  } else {
    console.log('excluded_preferences table exists');
  }

  // Check if tag_categories table exists
  const { data: tagCats, error: tagCatsError } = await supabase
    .from('tag_categories')
    .select('id')
    .limit(1);

  if (tagCatsError) {
    console.log('tag_categories table error:', tagCatsError.message);
  } else {
    console.log('tag_categories table exists');
  }

  console.log('\n=== SQL to fix the function ===');
  console.log('Run this in Supabase SQL Editor:\n');
  console.log(`
DROP FUNCTION IF EXISTS get_excluded_scene_ids(UUID) CASCADE;

CREATE OR REPLACE FUNCTION get_excluded_scene_ids(p_user_id UUID)
RETURNS UUID[] AS $$
DECLARE
  excluded_tags TEXT[];
  result UUID[];
BEGIN
  -- Collect all tags from excluded categories
  SELECT ARRAY_AGG(DISTINCT tc.tag)
  INTO excluded_tags
  FROM excluded_preferences ep
  JOIN tag_categories tc ON tc.category_id = ep.category_id
  WHERE ep.user_id = p_user_id
    AND ep.exclusion_level = 'hard'
    AND ep.category_id IS NOT NULL;

  -- Add explicitly excluded tags
  SELECT ARRAY_AGG(ep.excluded_tag) || COALESCE(excluded_tags, ARRAY[]::TEXT[])
  INTO excluded_tags
  FROM excluded_preferences ep
  WHERE ep.user_id = p_user_id
    AND ep.excluded_tag IS NOT NULL
    AND ep.exclusion_level = 'hard';

  -- Find scenes with these tags
  SELECT ARRAY_AGG(DISTINCT s.id)
  INTO result
  FROM scenes s
  WHERE s.tags && excluded_tags;

  RETURN COALESCE(result, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_excluded_scene_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_excluded_scene_ids(UUID) TO anon;
  `);
}
run();
