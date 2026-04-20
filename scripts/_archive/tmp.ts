import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data } = await supabase.from('scenes').update({ is_active: false }).eq('slug', 'breeding-kink').select('slug, is_active');
console.log('Deactivated:', data);
